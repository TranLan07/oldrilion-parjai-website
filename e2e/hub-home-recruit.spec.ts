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

test("compteur de missions du hub : affiche un nombre, pas ∞", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // La valeur au-dessus du label "Missions" est un nombre, plus le placeholder ∞
  const value = await page.getByText("Missions", { exact: true }).locator("xpath=../p[1]").textContent();
  expect(value?.trim()).toMatch(/^\d+$/);
  expect(value).not.toContain("∞");
});

test("champ de recrutement de type Spécialisation : rendu en select des spés du clan", async ({ page }) => {
  const label = `Spé visée ${Date.now()}`;
  await login(page, "e2e_webmaster", "e2etest123");
  try {
    await page.goto("/clan/parjai/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Recrutement", exact: true }).click();
    await page.getByRole("button", { name: "+ Ajouter un champ" }).click();
    await page.getByPlaceholder("Intitulé du champ").last().fill(label);
    await page.locator("select").last().selectOption("specialization");
    await page.getByRole("button", { name: "Enregistrer le formulaire" }).click();
    await expect(page.getByText("Formulaire enregistré.")).toBeVisible({ timeout: 10000 });

    // Sur le formulaire public (non connecté), le champ est un select avec les spés
    const ctx = await page.context().browser()!.newContext();
    const p2 = await ctx.newPage();
    await p2.goto("/clan/parjai/recrutement", { waitUntil: "domcontentloaded" });
    await expect(p2.getByText(label)).toBeVisible({ timeout: 10000 });
    // Le dernier select du formulaire correspond au champ spé : contient Kyramud, pas Dha (secrète)
    const specSelect = p2.locator("select").last();
    const opts = await specSelect.innerText();
    expect(opts).toContain("Kyramud");
    expect(opts).not.toContain("Dha");
    await ctx.close();
  } finally {
    await page.request.put("/api/clan/parjai/admin/recruitment-fields", { data: { fields: [] } });
  }
});
