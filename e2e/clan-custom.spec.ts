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

test.describe("Couleur des spécialisations sur l'accueil clan (premium)", () => {
  test("le nom et le contour de la spé prennent sa couleur custom", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    // Récupère les spés et applique une couleur à Kyramud
    const specs = await page.request.get("/api/clan/parjai/admin/specializations").then(r => r.json());
    const kyramud = specs.find((s: { name: string }) => s.name === "Kyramud");
    try {
      const put = await page.request.put("/api/clan/parjai/admin/specializations", { data: { id: kyramud.id, color: "#ff5500" } });
      expect(put.ok()).toBeTruthy();

      await page.goto("/clan/parjai", { waitUntil: "domcontentloaded" });
      // Le nom de la spé Kyramud est coloré en #ff5500 = rgb(255, 85, 0)
      const nameColor = await page.getByText("Kyramud", { exact: true }).evaluate(el => getComputedStyle(el as HTMLElement).color);
      expect(nameColor).toBe("rgb(255, 85, 0)");
      await page.screenshot({ path: "e2e/screenshots/spec-colors.png" });
    } finally {
      await page.request.put("/api/clan/parjai/admin/specializations", { data: { id: kyramud.id, color: null } });
    }
  });
});

test.describe("Couverture publique depuis le profil", () => {
  test("choisir une spé publique comme couverture met à jour le profil", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    try {
      await page.goto("/profil", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Couverture publique")).toBeVisible();

      // Le select liste les spés publiques (Goran), pas les secrètes (Dha)
      const cover = page.locator("select").filter({ hasText: "Aucune (spé réelle affichée)" });
      await expect(cover).toBeVisible();
      const options = await cover.innerText();
      expect(options).toContain("Goran");
      expect(options).not.toContain("Dha");

      await cover.selectOption("Goran");

      // Persisté côté serveur
      await expect.poll(async () => {
        const r = await page.request.get("/api/profil");
        const j = await r.json().catch(() => ({}));
        return j?.publicSpecialization;
      }, { timeout: 10000 }).toBe("Goran");
    } finally {
      await page.request.put("/api/profil", { data: { publicSpecialization: "" } });
    }
  });
});
