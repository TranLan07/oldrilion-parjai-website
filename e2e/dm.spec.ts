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

test.describe("Messagerie privée entre joueurs (depuis les contacts)", () => {
  test("bouton Message → conversation dans la messagerie, discussion listée dans les contacts", async ({ page }) => {
    await login(page, "e2e_webmaster", "e2etest123");

    // S'assure que e2e_target est dans le carnet de contacts (via son publicId)
    await page.request.post("/api/contacts", { data: { publicId: "E2ETGT", nickname: "" } }).catch(() => {});

    await page.goto("/contacts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Contacts & messages" })).toBeVisible();

    // Section Discussions présente au même endroit que les contacts
    await expect(page.getByText("Discussions")).toBeVisible();

    // Clique "Message" sur le contact → ouvre la conversation dans la messagerie
    await page.getByRole("button", { name: "Message" }).first().click();
    await page.waitForURL(/\/messagerie\?channel=/, { timeout: 10000 });

    // Envoie un message dans la conversation privée
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Salut, dispo pour un contrat ?");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await expect(page.getByText("Salut, dispo pour un contrat ?")).toBeVisible({ timeout: 10000 });

    // La discussion apparaît maintenant dans la liste des contacts
    await page.goto("/contacts", { waitUntil: "domcontentloaded" });
    await expect.poll(async () => {
      const r = await page.request.get("/api/dm");
      const j = await r.json().catch(() => []);
      return Array.isArray(j) && j.length;
    }, { timeout: 10000 }).toBeGreaterThan(0);
    await page.screenshot({ path: "e2e/screenshots/contacts-dm.png" });
  });
});
