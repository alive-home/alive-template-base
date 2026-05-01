import { defineConfig, devices } from "@playwright/test";

const WEB = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://localhost:3001";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret-do-not-use-in-prod";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: WEB,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: process.env.CI
		? undefined
		: [
				{
					command: "bun --filter @template/api dev",
					url: `${API}/health`,
					reuseExistingServer: true,
					cwd: "..",
					env: { AUTH_SECRET, API_BASE_URL: API, WEB_BASE_URL: WEB },
				},
				{
					command: "bun --filter @template/web dev",
					url: WEB,
					reuseExistingServer: true,
					cwd: "..",
				},
			],
});
