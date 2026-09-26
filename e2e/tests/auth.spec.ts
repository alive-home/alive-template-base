import { createORPCClient, ORPCError } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"
import { expect, test } from "@playwright/test"
import type { AppRouter } from "@template/api/router"

const API = process.env.API_BASE_URL ?? "http://localhost:3001"
const PASSWORD = process.env.AUTH_SECRET ?? "dev-secret-do-not-use-in-prod"

function client(token?: string): RouterClient<AppRouter> {
  return createORPCClient(
    new RPCLink({
      url: `${API}/rpc`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  )
}

test("protected todo endpoints require a JWT issued by login", async () => {
  const anon = client()

  await expect(anon.todo.list()).rejects.toThrow(ORPCError)

  const { token } = await anon.auth.login({ password: PASSWORD })
  expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)

  const authed = client(token)

  const created = await authed.todo.create({ title: "playwright todo" })
  expect(created.title).toBe("playwright todo")
  expect(created.done).toBe(false)

  const list = await authed.todo.list()
  expect(list.find(t => t.id === created.id)).toBeTruthy()
})

test("login rejects a wrong password", async () => {
  const anon = client()
  await expect(anon.auth.login({ password: "definitely-not-the-secret" })).rejects.toThrow(/UNAUTHORIZED|bad password/)
})
