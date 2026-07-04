import { test, expect, Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  // Session établie quand /api/auth/session renvoie un utilisateur
  await expect.poll(async () => {
    const r = await page.request.get("/api/auth/session");
    const j = await r.json().catch(() => ({}));
    return j?.user?.id ? "ok" : "no";
  }, { timeout: 10000 }).toBe("ok");
}

test.describe("Authentification & navigation", () => {
  test("login admin échoue avec un mauvais mot de passe", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').first().fill("admin");
    await page.locator('input[type="password"]').fill("mauvais");
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page.getByText("Identifiants incorrects")).toBeVisible();
  });

  test("login admin réussit et ouvre le dropdown App du hub", async ({ page }) => {
    await login(page, "admin", "admin");
    await page.goto("/");
    // Le bouton App n'apparaît qu'une fois connecté
    const appBtn = page.getByRole("button", { name: "App" });
    await expect(appBtn).toBeVisible();
    await appBtn.hover();
    // Le dropdown expose les 4 liens applicatifs
    for (const label of ["Messages", "Missions", "Événements", "Marketplace"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("le dropdown App de la ClanNavbar apparaît pour un membre du clan", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/clan/parjai");
    const appBtn = page.getByRole("button", { name: "App" });
    await expect(appBtn).toBeVisible();
    await appBtn.hover();
    for (const label of ["Messages", "Missions", "Banque"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });
});

test.describe("Banque (webmaster, parcours authentifié)", () => {
  test("un dépôt affiche une confirmation et augmente le solde", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");

    // Solde initial via l'API (partage les cookies de session)
    const before = await page.request.get("/api/clan/parjai/banque").then(r => r.json());
    const balanceBefore = before.balance as number;

    await page.goto("/clan/parjai/banque");
    await page.locator('input[type="number"]').fill("100");
    await page.getByRole("button", { name: /déposer/i }).click();

    await expect(page.getByText(/Transaction enregistrée/i)).toBeVisible();

    const after = await page.request.get("/api/clan/parjai/banque").then(r => r.json());
    expect(after.balance).toBe(balanceBefore + 100);
  });
});
