#!/usr/bin/env bun
// Checks the files every agent session reads as instructions: AGENTS.md, CLAUDE.md, MEMORY.md
// and the project skills in .claude/skills. Budgets keep them cheap to load on every turn; the
// scan keeps planted instructions, hidden Unicode and pasted secrets out of them.
// Threat patterns adapted from Hermes Agent (NousResearch/hermes-agent, tools/threat_patterns.py).

// A module, so the top-level awaits below type-check.
export {}

const MEMORY_FILE = "MEMORY.md"
const MEMORY_LIMIT = 4_000
const MEMORY_WARN_RATIO = 0.8
const AGENTS_LIMIT = 12_000
const DESCRIPTION_LIMIT = 1_024
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SKILL_FILE = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/
const CONTEXT_FILE = /(?:^|\/)(?:AGENTS|CLAUDE|MEMORY)\.md$/

const RED = "\x1b[0;31m"
const YELLOW = "\x1b[0;33m"
const GREEN = "\x1b[0;32m"
const NC = "\x1b[0m"

// Bounded filler between attack words; unbounded repetition backtracks badly.
const FILLER = String.raw`(?:\w+\s+){0,8}`
const SECRET_VAR = String.raw`\$\{?\w*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)S?\b`

const THREATS: ReadonlyArray<readonly [id: string, pattern: string]> = [
  ["prompt-injection", String.raw`ignore\s+${FILLER}(?:previous|all|above|prior)\s+${FILLER}instructions`],
  ["disregard-rules", String.raw`disregard\s+${FILLER}(?:your|all|any)\s+${FILLER}(?:instructions|rules|guidelines)`],
  ["system-prompt-override", String.raw`system\s+prompt\s+override`],
  ["hide-from-user", String.raw`do\s+not\s+${FILLER}tell\s+${FILLER}the\s+user`],
  ["hidden-html-comment", "<!--[^>]{0,512}(?:ignore|override|system|secret|hidden)[^>]{0,512}-->"],
  ["hidden-div", String.raw`<\s*div\s+style\s*=\s*["'][^>]{0,2048}display\s*:\s*none`],
  ["role-hijack", String.raw`you\s+are\s+${FILLER}now\s+(?:a|an|the)\s+`],
  ["leak-system-prompt", String.raw`output\s+${FILLER}(?:system|initial)\s+prompt`],
  ["unset-agent-env", String.raw`unset\s+\w*(?:CLAUDE|CODEX|HERMES|AGENT|OPENAI|ANTHROPIC)\w*`],
  ["exfil-curl", String.raw`(?:curl|wget)\s+[^\n]{0,2048}${SECRET_VAR}`],
  [
    "read-secrets",
    String.raw`cat\s+[^\n]{0,2048}(?:\.env\b(?!\.example)|credentials|\.netrc|\.pgpass|\.npmrc|\.pypirc)`,
  ],
  ["ssh-backdoor", "authorized_keys"],
  [
    "hardcoded-secret",
    String.raw`(?:api[_-]?key|token|secret|password)\s*[=:]\s*["'](?![A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+["'])[A-Za-z0-9+/=_-]{20,}`,
  ],
  [
    "token-literal",
    String.raw`\b(?:ghp_[A-Za-z0-9]{36}|github_pat_\w{40,}|sk-ant-[\w-]{20,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|xox[abpors]-[\w-]{10,})`,
  ],
]
// Zero-width and bidirectional control characters, used to hide text from human reviewers.
const INVISIBLE = /[\u200b-\u200d\u2060\u2062-\u2064\ufeff\u202a-\u202e\u2066-\u2069]/g

const errors: string[] = []
const warnings: string[] = []

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length
const formatCount = (n: number) => n.toLocaleString("en-US")

function listFiles(): string[] {
  const result = Bun.spawnSync(["git", "ls-files", "--cached", "--others", "--exclude-standard"])
  if (!result.success) throw new Error(`git ls-files failed: ${result.stderr.toString()}`)
  return result.stdout.toString().split("\n").filter(Boolean)
}

function scanThreats(file: string, text: string) {
  for (const [id, pattern] of THREATS) {
    for (const match of text.matchAll(new RegExp(pattern, "gi"))) {
      errors.push(`${file}:${lineOf(text, match.index)} matches "${id}"`)
    }
  }
  for (const match of text.matchAll(INVISIBLE)) {
    const code = match[0].codePointAt(0)?.toString(16).padStart(4, "0")
    errors.push(`${file}:${lineOf(text, match.index)} contains invisible character U+${code}`)
  }
}

function readFrontmatter(text: string): Map<string, string> | undefined {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1]
  if (block === undefined) return undefined
  const fields = new Map<string, string>()
  let current: string | undefined
  for (const line of block.split("\n")) {
    const field = /^([a-z][\w-]*):\s*(.*)$/.exec(line)
    if (field?.[1] !== undefined) {
      current = field[1]
      fields.set(current, (field[2] ?? "").replace(/^[>|][-+]?$/, ""))
    } else if (current !== undefined && /^\s+\S/.test(line)) {
      // Continuation line of a folded or multi-line value.
      fields.set(current, `${fields.get(current) ?? ""} ${line.trim()}`.trim())
    }
  }
  for (const [key, value] of fields) fields.set(key, value.trim().replace(/^(["'])(.*)\1$/, "$2"))
  return fields
}

function checkSkill(file: string, folder: string, text: string) {
  const fields = readFrontmatter(text)
  if (fields === undefined) {
    errors.push(`${file} has no frontmatter (--- name / description ---)`)
    return
  }
  const name = fields.get("name") ?? ""
  const description = fields.get("description") ?? ""
  if (name !== folder) errors.push(`${file}: name "${name}" must equal its folder "${folder}"`)
  if (!SKILL_NAME.test(folder) || folder.length > 64) {
    errors.push(`${file}: folder "${folder}" must be lowercase-hyphenated, at most 64 chars`)
  }
  if (description === "") errors.push(`${file}: description is empty; agents pick skills by it`)
  if (description.length > DESCRIPTION_LIMIT) {
    errors.push(`${file}: description is ${description.length} chars (limit ${DESCRIPTION_LIMIT})`)
  }
}

function checkMemory(text: string) {
  const used = text.length
  const ratio = used / MEMORY_LIMIT
  const usage = `${formatCount(used)}/${formatCount(MEMORY_LIMIT)} chars (${Math.round(ratio * 100)}%)`
  if (used > MEMORY_LIMIT) {
    errors.push(`${MEMORY_FILE} is over budget: ${usage}. Consolidate it (curate skill).`)
  } else if (ratio >= MEMORY_WARN_RATIO) {
    warnings.push(`${MEMORY_FILE} at ${usage}. Consolidate before adding more (curate skill).`)
  }
  return usage
}

const files = listFiles().filter(file => CONTEXT_FILE.test(file) || /^\.claude\/skills\/.+\.md$/.test(file))
let memoryUsage = "missing"
let skillCount = 0

for (const file of files) {
  const handle = Bun.file(file)
  // Tracked but deleted in the working tree.
  if (!(await handle.exists())) continue
  const text = (await handle.text()).replace(/\r\n/g, "\n")
  scanThreats(file, text)

  if (file === MEMORY_FILE) memoryUsage = checkMemory(text)
  if (file.endsWith("AGENTS.md") && text.length > AGENTS_LIMIT) {
    errors.push(
      `${file} is ${formatCount(text.length)} chars (limit ${formatCount(AGENTS_LIMIT)}). Move area rules out.`,
    )
  }
  const skill = SKILL_FILE.exec(file)?.[1]
  if (skill !== undefined) {
    skillCount += 1
    checkSkill(file, skill, text)
  }
}

if (memoryUsage === "missing") errors.push(`${MEMORY_FILE} is missing; agents expect it at the repo root`)

for (const warning of warnings) console.log(`${YELLOW}WARN${NC} ${warning}`)
for (const error of errors) console.log(`${RED}FAIL${NC} ${error}`)

if (errors.length > 0) {
  console.log(`\n${RED}${errors.length} agent-context problem(s).${NC} See AGENTS.md § Agent context files are code.`)
  process.exit(1)
}

console.log(`${GREEN}Agent context OK${NC} (${files.length} files, ${skillCount} skills, memory ${memoryUsage})`)
