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

test.describe("Formulaire de recrutement", () => {
  test("accessible et soumissible par un utilisateur NON connecté", async ({ page }) => {
    // Aucune connexion
    await page.goto("/clan/parjai/recrutement", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Recrutement" })).toBeVisible();

    // La spé secrète "Dha" ne doit PAS apparaître dans le select
    const specOptions = await page.locator("select").first().innerText();
    expect(specOptions).toContain("Kyramud");
    expect(specOptions).not.toContain("Dha");

    const texts = page.locator('input[type="text"]');
    await texts.nth(0).fill("Vhon Kryze");   // Nom RP
    await texts.nth(1).fill("vhon#4242");    // Discord
    const areas = page.locator("textarea");
    await areas.nth(0).fill("5 ans de RP mandalorien."); // Expérience
    await areas.nth(1).fill("Rejoindre les Exécuteurs Rouges."); // Motivation
    await page.getByRole("button", { name: /Envoyer la candidature/i }).click();

    await expect(page.getByText("Candidature envoyée !")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "e2e/screenshots/recrutement-public.png" });
  });

  test("un admin premium ajoute un champ custom, visible sur le formulaire public", async ({ page }) => {
    const label = `Âge RP ${Date.now()}`;
    await login(page, "e2e_webmaster", "e2etest123");

    try {
      await page.goto("/clan/parjai/admin", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Recrutement", exact: true }).click();

      // Le form builder est visible (premium)
      await expect(page.getByText("Formulaire de recrutement")).toBeVisible();
      await page.getByRole("button", { name: "+ Ajouter un champ" }).click();
      await page.getByPlaceholder("Intitulé du champ").last().fill(label);
      await page.getByRole("button", { name: "Enregistrer le formulaire" }).click();
      await expect(page.getByText("Formulaire enregistré.")).toBeVisible({ timeout: 10000 });

      // Le champ apparaît sur le formulaire public (contexte non connecté)
      const ctx = await page.context().browser()!.newContext();
      const p2 = await ctx.newPage();
      await p2.goto("/clan/parjai/recrutement", { waitUntil: "domcontentloaded" });
      await expect(p2.getByText(label)).toBeVisible({ timeout: 10000 });
      await ctx.close();
    } finally {
      // Nettoyage : vide les champs custom
      await page.request.put("/api/clan/parjai/admin/recruitment-fields", { data: { fields: [] } });
    }
  });

  test("un membre de clan voit le message « déjà dans un clan » au lieu du formulaire", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/clan/parjai/recrutement", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/appartenez déjà à un clan/i)).toBeVisible();
  });
});

test.describe("Quitter son clan (depuis le profil)", () => {
  test("le bouton + pop-up de confirmation retire l'utilisateur de son clan", async ({ page, browser }) => {
    // Précondition : s'assurer que e2e_leaver est bien dans Parjai (idempotence entre runs)
    const adminCtx = await browser.newContext();
    const ap = await adminCtx.newPage();
    await login(ap, "admin", "admin");
    const users = await ap.request.get("/api/hub/admin/users").then(r => r.json());
    const leaver = users.find((u: { username: string }) => u.username === "e2e_leaver");
    const clans = await ap.request.get("/api/hub/admin/clans").then(r => r.json());
    const parjai = clans.find((c: { slug: string }) => c.slug === "parjai");
    await ap.request.put("/api/hub/admin/users", { data: { id: leaver.id, clanId: parjai.id, permissionLevel: 1 } });
    await adminCtx.close();

    await login(page, "e2e_leaver", "e2etest123");
    {
      await page.goto("/profil", { waitUntil: "domcontentloaded" });
      // La carte clan est visible avec le bouton Quitter
      await expect(page.getByText("Mon clan")).toBeVisible();
      await page.getByRole("button", { name: "Quitter le clan" }).first().click();

      // La pop-up de confirmation apparaît
      await expect(page.getByRole("heading", { name: "Quitter le clan ?" })).toBeVisible();
      await page.screenshot({ path: "e2e/screenshots/leave-clan-modal.png" });

      // Confirme dans la pop-up
      await page.locator("div.max-w-sm").getByRole("button", { name: "Quitter le clan" }).click();

      // Après départ : le profil ne montre plus de clan (API à jour)
      await expect.poll(async () => {
        const r = await page.request.get("/api/profil");
        const j = await r.json().catch(() => ({}));
        return j?.clan;
      }, { timeout: 10000 }).toBeNull();
    }
  });
});
