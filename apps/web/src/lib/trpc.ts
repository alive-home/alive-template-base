import { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "@template/api/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { env } from "#/env.ts";
import { getToken } from "#/lib/auth.ts";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000, retry: 1 },
	},
});

// Resolve the tRPC endpoint URL.
//
//   VITE_API_BASE_URL set     → use it directly (e.g.
//                               "http://localhost:3001/trpc" in dev when
//                               api runs on its own port).
//   VITE_API_BASE_URL unset   → "/trpc", same-origin (production
//                               default; web's nginx proxies /trpc to
//                               the api container — see
//                               apps/web/nginx.conf).
const trpcUrl = env.VITE_API_BASE_URL
	? `${env.VITE_API_BASE_URL}/trpc`
	: "/trpc";

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: trpcUrl,
			headers: () => {
				const token = getToken();
				return token ? { authorization: `Bearer ${token}` } : {};
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
