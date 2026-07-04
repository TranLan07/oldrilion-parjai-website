import { defineConfig, devices } from "@playwright/test";

// Les tests E2E tournent contre un serveur déjà démarré sur :3000.
// Démarrer avec : npm run build && npx next start   (puis npm run test:e2e)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx next start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
