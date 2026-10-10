// Alive publishes a project by running `bun run build` at the repo root and
// shipping ./dist as a static site. The web app builds into apps/web/dist, so
// mirror it at the root. Only the static web app is published; apps/api does
// not run on a published site.
import { cpSync, rmSync } from "node:fs"

rmSync("dist", { recursive: true, force: true })
cpSync("apps/web/dist", "dist", { recursive: true })
