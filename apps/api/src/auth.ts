import { sign, verify } from "hono/jwt"
import { env } from "./env.ts"

export type Session = { user: { id: string } }

const SUBJECT = "user"

export async function issueToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  return sign({ sub: SUBJECT, exp }, env.AUTH_SECRET, "HS256")
}

export async function readSession(headers: Headers): Promise<Session | null> {
  const auth = headers.get("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token) return null
  try {
    const payload = await verify(token, env.AUTH_SECRET, "HS256")
    if (typeof payload.sub !== "string") return null
    return { user: { id: payload.sub } }
  } catch {
    return null
  }
}

export function checkPassword(password: string): boolean {
  return password === env.AUTH_SECRET
}
