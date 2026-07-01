import { expect, test } from "@playwright/test";
import { demoUser, loginViaUi } from "./helpers";

const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:3001";

test.describe("spec 05 — login básico", () => {
  test("CA-05.8: /dashboard sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Feature Flags" })).toBeVisible();
  });

  test("login ko muestra error de credenciales", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-form").waitFor();
    await page.locator("#username").fill(demoUser.username);
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login ok redirige al dashboard y muestra sesión", async ({ page }) => {
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(`Sesión activa como ${demoUser.username}`)).toBeVisible();
  });

  test("logout vuelve al login y bloquea el dashboard", async ({ page }) => {
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("CA-05.6: evaluate es público sin cookie de sesión", async ({ request }) => {
    const single = await request.get(
      `${apiUrl}/api/v1/flags/checkout_v2/evaluate?environment=production&user_id=u1`,
    );
    expect(single.status()).not.toBe(401);
    expect(single.status()).toBe(200);

    const batch = await request.post(`${apiUrl}/api/v1/flags/evaluate-batch`, {
      data: { keys: ["checkout_v2"], context: { user_id: "u1" } },
    });
    expect(batch.status()).not.toBe(401);
    expect(batch.status()).toBe(200);
  });

  test("CA-05.3: ruta admin sin sesión responde 401", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/flags`);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});
