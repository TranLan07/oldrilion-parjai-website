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

test.describe("Profil — carte clan + header contextuel", () => {
  test("le profil hub affiche la carte clan (grade, spé, niveau)", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Mon clan")).toBeVisible();
    await expect(page.getByText("PARJAI")).toBeVisible();
    await expect(page.getByText("Niveau d'accès", { exact: true })).toBeVisible();
    await expect(page.getByText("Mand'alor")).toBeVisible();       // grade
    await expect(page.getByText("Kyramud").first()).toBeVisible(); // spécialisation
    await page.screenshot({ path: "e2e/screenshots/profil-hub.png", fullPage: true });
  });

  test("le profil consulté depuis un clan conserve le header du clan", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/clan/parjai/profil", { waitUntil: "domcontentloaded" });
    // Le header du clan (ClanNavbar) montre le fil "Hub ›" + le nom du clan en lien
    await expect(page.getByRole("link", { name: "Hub" })).toBeVisible();
    await expect(page.getByRole("link", { name: "PARJAI" })).toBeVisible();
    // Et pas le header du hub "LE HUB"
    await expect(page.getByRole("link", { name: "LE HUB" })).toHaveCount(0);
  });
});

test.describe("Marketplace de clan (premium)", () => {
  test("publie une annonce de clan qui apparaît dans la liste", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/clan/parjai/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();

    await page.getByRole("button", { name: "+ Annonce" }).click();
    const title = `Beskar E2E ${Date.now()}`;
    await page.getByPlaceholder("Titre *").fill(title);
    await page.getByPlaceholder(/Prix/).fill("250");
    await page.getByRole("button", { name: "Publier" }).click();

    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screenshots/clan-marketplace.png" });
  });
});

test.describe("Permissions clan par défaut", () => {
  test("toutes les pages standard sont référencées avec un niveau par défaut", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    const pages = await page.request.get("/api/clan/parjai/admin/pages").then(r => r.json());
    const paths = pages.map((p: { path: string }) => p.path);
    for (const expected of ["accueil", "lore", "regles", "membres", "messagerie", "missions", "evenements", "banque", "diplomatie", "admin"]) {
      expect(paths, `page "${expected}" référencée`).toContain(expected);
    }
    // "admin" a bien un niveau par défaut élevé
    const admin = pages.find((p: { path: string }) => p.path === "admin");
    expect(admin.minPermission).toBe(10);
  });
});

test.describe("App dropdown clan — Marketplace premium", () => {
  test("le lien Marketplace apparaît dans le dropdown App d'un clan premium", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/clan/parjai", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "App" }).hover();
    await expect(page.getByRole("link", { name: "Marketplace" })).toBeVisible();
  });
});

test.describe("Personnalisation premium — surface (header/footer/cartes)", () => {
  test("la couleur de surface s'applique au header du clan", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    try {
      // Applique une couleur de surface distinctive (admin d'un clan premium)
      const put = await page.request.put("/api/clan/parjai/admin/settings", { data: { colorCard: "#123456" } });
      expect(put.ok()).toBeTruthy();

      await page.goto("/clan/parjai", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      // Le fond du header (nav) doit refléter la couleur de surface (#123456 = rgb(18,52,86))
      const navBg = await page.evaluate(() => getComputedStyle(document.querySelector("nav")!).backgroundColor);
      expect(navBg).toBe("rgb(18, 52, 86)");

      const footerBg = await page.evaluate(() => getComputedStyle(document.querySelector("footer")!).backgroundColor);
      expect(footerBg).toBe("rgb(18, 52, 86)");
    } finally {
      // Réinitialise pour l'idempotence
      await page.request.put("/api/clan/parjai/admin/settings", { data: { colorCard: "#0d0d0d" } });
    }
  });
});

test.describe("Mode debug (étoffé)", () => {
  test("panneau complet : permission clan custom, rôle hub, visiteur", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/profil", { waitUntil: "domcontentloaded" });

    // Active le mode debug via le toggle du profil
    await page.getByRole("button", { name: "Activer le mode debug" }).click();
    await expect(page.getByText(/Simule l'affichage pour un utilisateur/i)).toBeVisible();

    // Les contrôles clés du panneau sont présents (textes uniques au panneau)
    await expect(page.getByText("Permission HUB")).toBeVisible();
    await expect(page.getByText("Niveau de permission clan custom")).toBeVisible();
    await expect(page.getByText("Vision d'un visiteur sans compte")).toBeVisible();

    // Sur l'espace clan, l'onglet Admin est visible (webmaster perm 10)
    await page.goto("/clan/parjai", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toBeVisible();

    // Active la permission custom → slider apparaît → niveau 1 → Admin disparaît
    await page.getByLabel("Niveau de permission clan custom").check();
    await expect(page.locator('input[type="range"]')).toBeVisible();
    await page.locator('input[type="range"]').fill("1");
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

    await page.screenshot({ path: "e2e/screenshots/debug-mode.png" });

    // Vision visiteur : la navbar clan repasse en mode déconnecté (Recrutement visible, profil masqué)
    await page.getByLabel("Vision d'un visiteur sans compte").check();
    await expect(page.getByRole("link", { name: "Recrutement" })).toBeVisible();
  });

  test("simuler rôle hub Admin fait apparaître le lien Admin Hub", async ({ page }) => {
    await login(page, "e2e_leaver", "e2etest123"); // membre simple (hubRole member)
    await page.goto("/profil", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Activer le mode debug" }).click();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Admin Hub" })).toHaveCount(0);

    // Simule hubRole = admin
    await page.locator("select").first().selectOption("admin");
    await expect(page.getByRole("link", { name: "Admin Hub" })).toBeVisible();
  });
});
