import { expect, test } from "@playwright/test";
import { loginViaUi } from "./helpers";

test.describe("spec 06 — listado de flags", () => {
  test("CA-06: /flags sin sesión redirige a login", async ({ page }) => {
    await page.goto("/flags");
    await expect(page).toHaveURL(/\/login/);
  });

  test("CA-06: listado muestra filtro y estado vacío", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/flags");

    await expect(page).toHaveURL(/\/flags/);
    await expect(page.getByText("Listado de flags del sistema")).toBeVisible();
    await expect(page.getByLabel("Filtrar por status")).toBeVisible();
    await expect(page.getByText("No hay flags.")).toBeVisible();
  });

  test("CA-06: filtro por status actualiza mensaje vacío", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/flags");

    await page.getByLabel("Filtrar por status").selectOption("active");
    await expect(
      page.getByText('Ningún resultado para el filtro "active".'),
    ).toBeVisible();
  });
});
