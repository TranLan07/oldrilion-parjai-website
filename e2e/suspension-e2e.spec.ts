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

// Récupère l'id du clan Parjai via l'API admin (session admin requise)
async function parjaiId(page: Page): Promise<string> {
  const clans = await page.request.get("/api/hub/admin/clans").then(r => r.json());
  const p = clans.find((c: { slug: string }) => c.slug === "parjai");
  return p.id;
}

async function setSuspended(page: Page, id: string, suspended: boolean) {
  await page.request.put("/api/hub/admin/clans", {
    data: { id, suspended, suspendedReason: suspended ? "Test E2E" : "" },
  });
}

test.describe("Suspension d'un clan (end-to-end)", () => {
  test("écran de gel affiché + 403 sur l'API directe", async ({ page }) => {
    await login(page, "admin", "admin");
    const id = await parjaiId(page);

    try {
      await setSuspended(page, id, true);

      // 1. L'espace du clan affiche l'écran de gel
      await page.goto("/clan/parjai");
      await expect(page.getByText(/Clan suspendu/i)).toBeVisible();
      await expect(page.getByText(/Test E2E/)).toBeVisible();

      // 2. Une requête API directe est bloquée (403), pas juste masquée en UI
      const res = await page.request.get("/api/clan/parjai/members");
      expect(res.status()).toBe(403);

      const bankRes = await page.request.get("/api/clan/parjai/banque");
      expect(bankRes.status()).toBe(403);
    } finally {
      // Nettoyage : on lève toujours la suspension
      await setSuspended(page, id, false);
    }

    // 3. Après levée, l'accès est rétabli
    const restored = await page.request.get("/api/clan/parjai/members");
    expect(restored.status()).toBe(200);
  });
});
