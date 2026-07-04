import { test, expect } from "@playwright/test";

// Audit responsive : chaque page publique est chargée à plusieurs largeurs.
// On vérifie qu'aucun débordement horizontal (scroll latéral) n'apparaît —
// signe classique d'un layout cassé sur mobile — et on capture une screenshot.

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "clans", path: "/clans" },
  { name: "clan-home", path: "/clan/parjai" },
  { name: "clan-membres", path: "/clan/parjai/membres" },
  { name: "clan-lore", path: "/clan/parjai/lore" },
  { name: "clan-regles", path: "/clan/parjai/regles" },
  { name: "clan-recrutement", path: "/clan/parjai/recrutement" },
  { name: "clan-diplomatie", path: "/clan/parjai/diplomatie" },
  { name: "login", path: "/login" },
  { name: "contact", path: "/contact" },
];

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}px)`, () => {
    for (const pg of PAGES) {
      test(`${pg.name} — pas de débordement horizontal`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const resp = await page.goto(pg.path, { waitUntil: "networkidle" });
        expect(resp?.status(), `${pg.path} doit répondre 200`).toBeLessThan(400);

        await page.screenshot({ path: `e2e/screenshots/${pg.name}--${vp.name}.png`, fullPage: true });

        // Débordement horizontal : le contenu dépasse la largeur du viewport
        const overflow = await page.evaluate(() => {
          const de = document.documentElement;
          return { scrollW: de.scrollWidth, clientW: de.clientWidth };
        });
        // Tolérance de 1px (arrondis sub-pixel)
        expect(
          overflow.scrollW,
          `${pg.path} déborde : scrollWidth=${overflow.scrollW} > viewport=${vp.width}`
        ).toBeLessThanOrEqual(vp.width + 1);
      });
    }
  });
}
