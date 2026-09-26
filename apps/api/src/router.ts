import { ORPCError } from "@orpc/server"
import { CreateTodoInput, HelloInput, LoginInput, type Todo } from "@template/shared"
import { z } from "zod"
import { checkPassword, issueToken } from "./auth.ts"
import { protectedProcedure, publicProcedure } from "./orpc.ts"

const todos = new Map<string, Todo>()

export const appRouter = {
  health: publicProcedure.handler(() => ({ ok: true, ts: Date.now() })),

  hello: publicProcedure.input(HelloInput).handler(({ input, context }) => ({
    message: `Hello, ${input.name}!`,
    authedAs: context.session?.user.id ?? null,
  })),

  auth: {
    login: publicProcedure.input(LoginInput).handler(async ({ input }) => {
      if (!checkPassword(input.password)) {
        throw new ORPCError("UNAUTHORIZED", { message: "bad password" })
      }
      return { token: await issueToken() }
    }),
  },

  todo: {
    list: protectedProcedure.handler(() => Array.from(todos.values())),
    create: protectedProcedure.input(CreateTodoInput).handler(({ input }) => {
      const todo: Todo = {
        id: crypto.randomUUID(),
        title: input.title,
        done: false,
        createdAt: new Date().toISOString(),
      }
      todos.set(todo.id, todo)
      return todo
    }),
    toggle: protectedProcedure.input(z.object({ id: z.uuid() })).handler(({ input }) => {
      const t = todos.get(input.id)
      if (!t) throw new ORPCError("NOT_FOUND", { message: "not found" })
      const next = { ...t, done: !t.done }
      todos.set(t.id, next)
      return next
    }),
  },
}

export type AppRouter = typeof appRouter
