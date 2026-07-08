import { z } from "zod"

export const HelloInput = z.object({
  name: z.string().min(1).max(64),
})
export type HelloInput = z.infer<typeof HelloInput>

export const LoginInput = z.object({
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginInput>

export const Todo = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  done: z.boolean(),
  createdAt: z.iso.datetime(),
})
export type Todo = z.infer<typeof Todo>

export const CreateTodoInput = Todo.pick({ title: true })
export type CreateTodoInput = z.infer<typeof CreateTodoInput>
