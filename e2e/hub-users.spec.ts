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

test.describe("Admin hub — gestion des utilisateurs", () => {
  test("édite un utilisateur et réinitialise son mot de passe via l'UI", async ({ page }) => {
    await login(page, "admin", "admin");
    await page.goto("/hub/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Utilisateurs", exact: true }).click();

    // Cible l'utilisateur jetable e2e_target (le reset de mdp ne doit pas casser
    // les logins des autres tests, d'où un utilisateur dédié).
    await page.getByPlaceholder(/Rechercher/i).fill("e2e_target");
    const card = page.locator("div", { hasText: "@e2e_target" }).last();
    await card.getByRole("button", { name: "Éditer" }).click();

    // Le panneau d'édition expose les champs attendus
    await expect(page.getByText("Rôle hub (global)")).toBeVisible();
    await expect(page.getByText("Permission clan (niveau)")).toBeVisible();

    // Réinitialise le mot de passe → un mot de passe généré s'affiche
    await page.getByRole("button", { name: /Réinitialiser le mot de passe/i }).click();
    await expect(page.getByText(/Nouveau mot de passe/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "e2e/screenshots/hub-users-edit.png" });
  });

  test("modifie nom, permission et rôle via l'API (super admin)", async ({ page }) => {
    await login(page, "admin", "admin");

    // Récupère l'id de e2e_webmaster
    const users = await page.request.get("/api/hub/admin/users").then(r => r.json());
    const wm = users.find((u: { username: string }) => u.username === "e2e_webmaster");
    expect(wm).toBeTruthy();

    // Modifie plusieurs champs
    const put = await page.request.put("/api/hub/admin/users", {
      data: { id: wm.id, displayName: "WM Renommé", permissionLevel: 8 },
    });
    expect(put.ok()).toBeTruthy();

    // Vérifie la persistance
    const after = await page.request.get("/api/hub/admin/users").then(r => r.json());
    const wm2 = after.find((u: { id: string }) => u.id === wm.id);
    expect(wm2.displayName).toBe("WM Renommé");
    expect(wm2.permissionLevel).toBe(8);

    // Restaure le seed pour l'idempotence (le gating modérateur/403 est couvert
    // exhaustivement par les tests d'intégration hub-users.test.ts).
    await page.request.put("/api/hub/admin/users", { data: { id: wm.id, displayName: "E2E Webmaster", permissionLevel: 10 } });
  });
});
