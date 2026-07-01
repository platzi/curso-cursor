import { expect, test } from "@playwright/test";
import { loginAsDemo, loginViaUi } from "./helpers";

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

test.describe("spec 07 — crear y editar flag", () => {
  test("formulario de creación valida key vacía", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/flags/new");

    await expect(page.getByRole("heading", { name: "Nueva feature flag" })).toBeVisible();
    await page.getByRole("button", { name: "Crear flag" }).click();
    await expect(page.getByText("La key es obligatoria")).toBeVisible();
  });

  test("Nueva flag enlaza desde el listado", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/flags");

    await page.getByRole("link", { name: "Nueva flag" }).click();
    await expect(page).toHaveURL(/\/flags\/new/);
  });
});
