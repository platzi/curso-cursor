import { expect, type Page } from "@playwright/test";

export const demoUser = { username: "admin", password: "demo123" };

/** Establece sesión iniciando sesión por UI (fiable en prod y dev). */
export async function loginAsDemo(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-form").waitFor();
  await page.locator("#username").fill(demoUser.username);
  await page.locator("#password").fill(demoUser.password);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/login") && response.ok(),
    ),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);
}

/** Login por UI con redirección al dashboard. */
export async function loginViaUi(
  page: Page,
  credentials: { username: string; password: string } = demoUser,
): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-form").waitFor();
  await page.locator("#username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  await Promise.all([
    page.waitForURL(/\/dashboard/),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);
}
