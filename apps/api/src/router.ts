import {
	CreateTodoInput,
	HelloInput,
	LoginInput,
	type Todo,
} from "@template/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkPassword, issueToken } from "./auth.ts";
import { protectedProcedure, publicProcedure, router } from "./trpc.ts";

const todos = new Map<string, Todo>();

export const appRouter = router({
	health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

	hello: publicProcedure.input(HelloInput).query(({ input, ctx }) => ({
		message: `Hello, ${input.name}!`,
		authedAs: ctx.session?.user.id ?? null,
	})),

	auth: router({
		login: publicProcedure.input(LoginInput).mutation(async ({ input }) => {
			if (!checkPassword(input.password)) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "bad password" });
			}
			return { token: await issueToken() };
		}),
	}),

	todo: router({
		list: protectedProcedure.query(() => Array.from(todos.values())),
		create: protectedProcedure.input(CreateTodoInput).mutation(({ input }) => {
			const todo: Todo = {
				id: crypto.randomUUID(),
				title: input.title,
				done: false,
				createdAt: new Date().toISOString(),
			};
			todos.set(todo.id, todo);
			return todo;
		}),
		toggle: protectedProcedure
			.input(z.object({ id: z.uuid() }))
			.mutation(({ input }) => {
				const t = todos.get(input.id);
				if (!t) throw new Error("not found");
				const next = { ...t, done: !t.done };
				todos.set(t.id, next);
				return next;
			}),
	}),
});

export type AppRouter = typeof appRouter;
