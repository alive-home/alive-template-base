import { expect, test } from "@playwright/test";

const API = process.env.API_BASE_URL ?? "http://localhost:3001";

test("api health responds", async ({ request }) => {
	const res = await request.get(`${API}/health`);
	expect(res.ok()).toBe(true);
	await expect(res.json()).resolves.toEqual({ ok: true });
});

test("home page renders and greets", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Hello tRPC" })).toBeVisible();
	await page.getByPlaceholder("your name").fill("playwright");
	await page.getByRole("button", { name: "greet" }).click();
	await expect(page.getByText("Hello, playwright!")).toBeVisible();
});
