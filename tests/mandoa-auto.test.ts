import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de Prisma avant l'import du module testé
const upsertCalls: Array<Record<string, unknown>> = [];
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    dictionaryEntry: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async (args: Record<string, unknown>) => { upsertCalls.push(args); return {}; }),
    },
  },
}));

import { generateWord, translateWithAutoGenerate } from "../src/lib/mandoa-auto";

describe("generateWord — génération déterministe", () => {
  it("le même mot FR produit toujours le même mot mando'a", () => {
    const a = generateWord("ordinateur");
    const b = generateWord("ordinateur");
    expect(a).toBe(b);
  });

  it("des mots différents produisent (en général) des mots différents", () => {
    const words = ["maison", "voiture", "soleil", "montagne", "riviere", "fenetre", "portail", "lumiere"];
    const generated = new Set(words.map(generateWord));
    // Tolérance : au moins 6 mots distincts sur 8 (le hash peut produire de rares collisions)
    expect(generated.size).toBeGreaterThanOrEqual(6);
  });

  it("produit un mot au format C+V+C+V(+suffixe) non vide", () => {
    for (const seed of ["test", "bonjour", "a", "zzz"]) {
      const w = generateWord(seed);
      expect(w.length).toBeGreaterThanOrEqual(4);
      expect(w).toMatch(/^[a-z']+$/);
    }
  });
});

describe("translateWithAutoGenerate — persistance", () => {
  beforeEach(() => { upsertCalls.length = 0; });

  it("sauvegarde les mots générés avec isAuto: true", async () => {
    await translateWithAutoGenerate("xylophonique");
    expect(upsertCalls.length).toBeGreaterThan(0);
    const call = upsertCalls[0] as { create: { isAuto: boolean; french: string } };
    expect(call.create.isAuto).toBe(true);
    expect(call.create.french).toBe("xylophonique");
  });

  it("ne génère rien pour un texte entièrement traduit", async () => {
    await translateWithAutoGenerate("je");
    expect(upsertCalls.length).toBe(0);
  });

  it("ignore les tokens non alphabétiques", async () => {
    await translateWithAutoGenerate("123 !!!");
    expect(upsertCalls.length).toBe(0);
  });
});
