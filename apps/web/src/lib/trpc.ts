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

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${env.VITE_API_BASE_URL}/trpc`,
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
