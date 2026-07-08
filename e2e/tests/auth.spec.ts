import { expect, test } from "@playwright/test"
import type { AppRouter } from "@template/api/router"
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client"

const API = process.env.API_BASE_URL ?? "http://localhost:3001"
const PASSWORD = process.env.AUTH_SECRET ?? "dev-secret-do-not-use-in-prod"

function client(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API}/trpc`,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    ],
  })
}

test("protected todo endpoints require a JWT issued by login", async () => {
  const anon = client()

  await expect(anon.todo.list.query()).rejects.toThrow(TRPCClientError)

  const { token } = await anon.auth.login.mutate({ password: PASSWORD })
  expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)

  const authed = client(token)

  const created = await authed.todo.create.mutate({ title: "playwright todo" })
  expect(created.title).toBe("playwright todo")
  expect(created.done).toBe(false)

  const list = await authed.todo.list.query()
  expect(list.find(t => t.id === created.id)).toBeTruthy()
})

test("login rejects a wrong password", async () => {
  const anon = client()
  await expect(anon.auth.login.mutate({ password: "definitely-not-the-secret" })).rejects.toThrow(
    /UNAUTHORIZED|bad password/,
  )
})
