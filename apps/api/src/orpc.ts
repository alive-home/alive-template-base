import { ORPCError, os } from "@orpc/server"
import { readSession } from "./auth.ts"

// Initial context supplied by the fetch handler in index.ts.
export type Context = { headers: Headers }

const base = os.$context<Context>()

export const publicProcedure = base.use(async ({ context, next }) => {
  const session = await readSession(context.headers)
  return next({ context: { session } })
})

export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.session) throw new ORPCError("UNAUTHORIZED")
  return next({ context: { session: context.session } })
})
