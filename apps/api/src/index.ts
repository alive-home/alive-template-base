import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.ts";
import { appRouter } from "./router.ts";
import { createContext } from "./trpc.ts";

const app = new Hono();

app.use("*", logger());
app.use(
	"*",
	cors({
		origin: env.WEB_BASE_URL,
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

app.get("/health", (c) => c.json({ ok: true }));

app.all("/trpc/*", (c) =>
	fetchRequestHandler({
		endpoint: "/trpc",
		req: c.req.raw,
		router: appRouter,
		createContext,
	}),
);

export default {
	port: env.PORT,
	fetch: app.fetch,
};

console.log(`api → ${env.API_BASE_URL} (port ${env.PORT})`);
