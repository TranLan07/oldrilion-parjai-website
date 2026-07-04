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

test.describe("Messagerie Mando'a", () => {
  test("un mandalorien envoie un message traduit et voit la traduction", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");
    await page.goto("/clan/parjai/messagerie");

    // Le canal "général" se sélectionne automatiquement (premier canal)
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible({ timeout: 10000 });

    // Active le mode Mando'a — le bouton n'est visible QUE si session.mandalorien
    // est propagé (régression corrigée dans auth.ts : le flag manquait au JWT/session).
    const mandoaToggle = page.getByRole("button", { name: /mando'a/i });
    await expect(mandoaToggle).toBeVisible();
    await mandoaToggle.click();

    // Compte les messages Mando'a avant envoi (le canal accumule l'historique)
    const before = await page.getByText("Voir la traduction").count();

    const phrase = "je suis un guerrier";
    await input.fill(phrase);
    await page.getByRole("button", { name: /envoyer/i }).click();

    // Un nouveau message Mando'a apparaît, avec l'affordance de traduction
    // (réservée aux mandaloriens). +1 preuve le round-trip traduction complet.
    await expect.poll(
      () => page.getByText("Voir la traduction").count(),
      { timeout: 10000 }
    ).toBe(before + 1);

    // En dépliant le dernier, on retrouve le texte français original masqué
    const lastTranslation = page.getByText("Voir la traduction").last();
    await lastTranslation.scrollIntoViewIfNeeded();
    await lastTranslation.click();
    await expect(page.getByText(phrase).last()).toBeVisible();
  });
});
