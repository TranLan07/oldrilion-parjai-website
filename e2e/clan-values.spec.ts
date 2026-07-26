import { test, expect, Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect.poll(async () => {
    const r = await page.request.get("/api/auth/session");
    const j = await r.json().catch(() => ({}));
    return j?.user?.id ? "ok" : "no";
  }, { timeout: 10000 }).toBe("ok");
}

const DEFAULTS = [
  { title: "Honneur", description: "Le Resol'nare guide chacun de nos pas. Nous vivons selon le code mandalorien." },
  { title: "Fraternité", description: "Aliit ori'shya tal'din — Le clan est plus que le sang. Chaque membre est famille." },
  { title: "Combat", description: "Forgés dans la bataille, nous défendons les nôtres avec la ténacité du beskar." },
];

test.describe("Valeurs du clan (personnalisables)", () => {
  test("édition via l'onglet Valeurs, reflétée sur l'accueil", async ({ page }) => {
    const titre = `Loyauté ${Date.now()}`;
    await login(page, "e2e_webmaster", "e2etest123");
    try {
      await page.goto("/clan/parjai/admin", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Valeurs", exact: true }).click();

      // Le builder charge les 3 valeurs par défaut
      await expect(page.getByPlaceholder("Titre (ex : Honneur)").first()).toHaveValue("Honneur");

      // Renomme la 1re valeur et enregistre
      await page.getByPlaceholder("Titre (ex : Honneur)").first().fill(titre);
      await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(page.getByText("Valeurs enregistrées.")).toBeVisible({ timeout: 10000 });

      // L'accueil du clan reflète le nouveau titre
      await page.goto("/clan/parjai", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: titre })).toBeVisible({ timeout: 10000 });
    } finally {
      await page.request.put("/api/clan/parjai/admin/values", { data: { values: DEFAULTS } });
    }
  });

  test("clan premium : couleur custom appliquée au titre et au contour", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    try {
      // Applique une couleur custom via l'API
      const put = await page.request.put("/api/clan/parjai/admin/values", {
        data: { values: [
          { title: "Honneur", description: "d", color: "#3366ff" },
          ...DEFAULTS.slice(1),
        ] },
      });
      expect(put.ok()).toBeTruthy();

      await page.goto("/clan/parjai", { waitUntil: "domcontentloaded" });
      // Le titre "Honneur" est coloré en #3366ff = rgb(51, 102, 255)
      const color = await page.getByRole("heading", { name: "Honneur" }).evaluate(el => getComputedStyle(el as HTMLElement).color);
      expect(color).toBe("rgb(51, 102, 255)");
      await page.screenshot({ path: "e2e/screenshots/clan-values.png" });
    } finally {
      await page.request.put("/api/clan/parjai/admin/values", { data: { values: DEFAULTS } });
    }
  });
});
