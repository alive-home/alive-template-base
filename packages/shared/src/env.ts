import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

/**
 * Public origins shared by every app in the workspace.
 * Each app composes this with its own private vars.
 */
export const sharedEnv = createEnv({
  server: {
    API_BASE_URL: z.url(),
    WEB_BASE_URL: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
