import { RPCHandler } from "@orpc/server/fetch"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { env } from "./env.ts"
import { appRouter } from "./router.ts"

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: env.WEB_BASE_URL,
    allowHeaders: ["Content-Type", "Authorization"],
  }),
)

app.get("/health", c => c.json({ ok: true }))

const rpcHandler = new RPCHandler(appRouter)

app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { headers: c.req.raw.headers },
  })
  if (matched) return c.newResponse(response.body, response)
  await next()
})

export default {
  port: env.PORT,
  fetch: app.fetch,
}

console.log(`api → ${env.API_BASE_URL} (port ${env.PORT})`)
