import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
    server: {
      port: Number(env.PORT ?? 3000),
      host: true,
      // Dev-only mirror of nginx.conf's `location /trpc/` so the same-origin
      // "/trpc" client default reaches the api (bun, :3001) in dev too.
      proxy: {
        "/trpc": env.API_PROXY_TARGET ?? "http://localhost:3001",
      },
    },
    preview: {
      port: Number(env.PORT ?? 3000),
      host: true,
    },
  }
})
