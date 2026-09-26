import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { QueryClient } from "@tanstack/react-query"
import type { AppRouter } from "@template/api/router"
import { env } from "#/env.ts"
import { getToken } from "#/lib/auth.ts"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// Resolve the oRPC endpoint URL.
//
//   VITE_API_BASE_URL set     → use it directly (e.g.
//                               "http://localhost:3001/rpc" when api runs
//                               on its own port without a proxy).
//   VITE_API_BASE_URL unset   → same-origin "/rpc" (default; web's nginx
//                               in production and vite's dev proxy forward
//                               /rpc to the api — see apps/web/nginx.conf
//                               and apps/web/vite.config.ts).
const rpcUrl = env.VITE_API_BASE_URL ? `${env.VITE_API_BASE_URL}/rpc` : `${window.location.origin}/rpc`

const link = new RPCLink({
  url: rpcUrl,
  headers: () => {
    const token = getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  },
})

export const client: RouterClient<AppRouter> = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
