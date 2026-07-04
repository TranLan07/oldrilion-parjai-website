import { describe, it, expect } from "vitest";
import { translate } from "../src/lib/translator";

describe("translator — fr → mando'a", () => {
  it("traduit les mots connus du dictionnaire", () => {
    const r = translate("je suis guerrier", "fr-to-mandoa");
    expect(r.output).toContain("ni");
    expect(r.output).toContain("verd");
    expect(r.words.find(w => w.original === "je")?.found).toBe(true);
    expect(r.words.find(w => w.original === "guerrier")?.found).toBe(true);
  });

  it("laisse les mots inconnus tels quels avec found: false", () => {
    const r = translate("xyzzyplugh", "fr-to-mandoa");
    const w = r.words.find(w => w.original === "xyzzyplugh");
    expect(w).toBeDefined();
    expect(w!.found).toBe(false);
    expect(w!.translated).toBe("xyzzyplugh");
  });

  it("gère les élisions françaises (j'aime → je + aime)", () => {
    const r = translate("j'aime", "fr-to-mandoa");
    // "je" → "ni" doit apparaître
    expect(r.words.some(w => w.original === "je" && w.translated === "ni")).toBe(true);
  });

  it("est insensible aux accents et à la casse", () => {
    const a = translate("Père", "fr-to-mandoa");
    const b = translate("pere", "fr-to-mandoa");
    expect(a.words[0].translated).toBe("buir");
    expect(b.words[0].translated).toBe("buir");
  });

  it("préserve la ponctuation", () => {
    const r = translate("clan, guerre !", "fr-to-mandoa");
    expect(r.output).toMatch(/,/);
    expect(r.output).toMatch(/!/);
  });

  it("applique le dictionnaire custom en priorité", () => {
    const r = translate("clan", "fr-to-mandoa", { clan: "customword" });
    expect(r.words[0].translated).toBe("customword");
  });
});

describe("translator — mando'a → fr", () => {
  it("traduit les mots mando'a connus", () => {
    const r = translate("buir", "mandoa-to-fr");
    expect(r.words[0].found).toBe(true);
  });

  it("gère le préfixe passé (ru')", () => {
    const r = translate("ru'akaanir", "mandoa-to-fr");
    expect(r.words[0].translated).toContain("(passé)");
  });
});

describe("translator — détection de direction", () => {
  it("détecte le français", () => {
    const r = translate("je suis un guerrier");
    expect(r.direction).toBe("fr-to-mandoa");
  });

  it("détecte le mando'a", () => {
    const r = translate("ni cuy' verd");
    expect(r.direction).toBe("mandoa-to-fr");
  });
});
