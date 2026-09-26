import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

// VITE_API_BASE_URL accepts:
//   - undefined / empty → oRPC client uses same-origin "/rpc" (the
//     Alive deploy default; web's nginx proxies /rpc to the api
//     container — see apps/web/nginx.conf).
//   - absolute URL like "http://localhost:3001" → used verbatim (local
//     dev when api and web run on different ports without a proxy).
// `emptyStringAsUndefined` below converts "" to undefined.
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_API_BASE_URL: z.url().optional(),
    VITE_WEB_BASE_URL: z.url().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
