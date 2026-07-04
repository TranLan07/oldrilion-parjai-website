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

const SIZES = [
  { name: "PC-1280", w: 1280, h: 800 },
  { name: "mobile-375", w: 375, h: 812 },
];

for (const s of SIZES) {
  test(`messagerie hub — remplit la hauteur, input en bas, pas de débordement (${s.name})`, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.h });
    await login(page, "admin", "admin");
    await page.goto("/messagerie", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const metrics = await page.evaluate(() => {
      const root = document.querySelector("main > div") as HTMLElement;
      const form = document.querySelector("main form") as HTMLElement | null;
      return {
        innerH: window.innerHeight,
        rootH: root ? Math.round(root.getBoundingClientRect().height) : -1,
        inputBottom: form ? Math.round(form.getBoundingClientRect().bottom) : -1,
        hasHorizScroll: document.documentElement.scrollWidth > window.innerWidth,
        navCount: document.querySelectorAll("nav").length,
      };
    });

    await page.screenshot({ path: `e2e/screenshots/hub-messagerie-${s.name}.png` });

    // Le conteneur remplit de la navbar au bas du viewport
    expect(metrics.rootH).toBeGreaterThan(metrics.innerH - 65);
    // L'input est collé au bas du viewport (pas flottant au milieu)
    expect(metrics.inputBottom).toBeGreaterThan(metrics.innerH - 5);
    expect(metrics.hasHorizScroll).toBe(false);
    expect(metrics.navCount).toBe(1);
  });
}
