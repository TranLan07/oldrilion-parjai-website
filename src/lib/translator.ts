import { frToMandoa as baseFrToMandoa, mandoaToFr as baseMandoaToFr } from "./dictionary";
import { getLemmas } from "./french-lemmatizer";

type Direction = "fr-to-mandoa" | "mandoa-to-fr";

interface TranslationResult {
  input: string;
  output: string;
  direction: Direction;
  words: { original: string; translated: string; found: boolean }[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[.,;:!?]/g, "").trim();
}

function removeAccents(s: string): string {
  return s
    .replace(/[éèêë]/g, "e").replace(/[àâ]/g, "a")
    .replace(/[ùûü]/g, "u").replace(/[ôö]/g, "o")
    .replace(/[îï]/g, "i").replace(/ç/g, "c");
}

function conjugateMandoa(verb: string): string {
  if (/[aeiou]r$/.test(verb) && verb.length > 3) return verb.slice(0, -1);
  return verb;
}

function isVerb(mandoaWord: string): boolean {
  return /[aeiou]r$/.test(mandoaWord) && mandoaWord.length > 3;
}

// French elision map: j' -> je, l' -> le/la, etc.
const elisionMap: Record<string, string[]> = {
  "j": ["je"], "t": ["te", "tu"], "l": ["le", "la"],
  "s": ["se"], "m": ["me"], "n": ["ne"],
  "d": ["de"], "qu": ["que"], "c": ["ce"],
};

function makeLookupFr(dict: Record<string, string>) {
  // Index secondaire sans accents : permet de trouver "père" en tapant "pere"
  const accentless: Record<string, string> = {};
  for (const [k, v] of Object.entries(dict)) {
    const na = removeAccents(k);
    if (na !== k && !accentless[na]) accentless[na] = v;
  }

  return (word: string): string | null => {
    const key = normalize(word);
    if (dict[key]) return dict[key];

    const noAccent = removeAccents(key);
    if (dict[noAccent]) return dict[noAccent];
    if (accentless[noAccent]) return accentless[noAccent];

    // NLP lemmatization: try all lemmas (infinitive forms) from the 7800+ verb database
    for (const lemma of getLemmas(key)) {
      if (dict[lemma]) return dict[lemma];
    }

    return null;
  };
}

function makeLookupMa(dict: Record<string, string>) {
  return (word: string): string | null => {
    const key = normalize(word);
    if (dict[key]) return dict[key];
    if (dict[key + "r"]) return dict[key + "r"];
    if (dict[key + "ir"]) return dict[key + "ir"];
    if (key.endsWith("se") && dict[key.slice(0, -2)]) return dict[key.slice(0, -2)] + " (pluriel)";
    if (key.endsWith("e") && dict[key.slice(0, -1)]) return dict[key.slice(0, -1)] + " (pluriel)";
    return null;
  };
}

// Split text into tokens, handling French elisions (j', l', etc.)
function tokenize(text: string): string[] {
  // First split on spaces and punctuation, but keep apostrophes within words
  const raw = text.split(/(\s+|[.,;:!?]+)/).filter(Boolean);
  const tokens: string[] = [];

  for (const t of raw) {
    if (/^[\s.,;:!?]+$/.test(t)) {
      tokens.push(t);
      continue;
    }

    // Check for French elisions: j'aime -> [je, aime], l'homme -> [le, homme]
    const elisionMatch = t.match(/^([jJtTlLsSmMnNdDcC]|[qQ][uU])'(.+)$/);
    if (elisionMatch) {
      const prefix = elisionMatch[1].toLowerCase();
      const rest = elisionMatch[2];
      const expansions = elisionMap[prefix];
      if (expansions) {
        // Use first expansion as the pronoun/article
        tokens.push(expansions[0]);
        tokens.push(rest);
        continue;
      }
    }

    tokens.push(t);
  }

  return tokens;
}

export function translate(
  text: string,
  direction?: Direction,
  customFr?: Record<string, string>,
  customMa?: Record<string, string>,
): TranslationResult {
  const frDict = customFr ? { ...baseFrToMandoa, ...customFr } : baseFrToMandoa;
  const maDict = customMa ? { ...baseMandoaToFr, ...customMa } : baseMandoaToFr;

  const lookupFr = makeLookupFr(frDict);
  const lookupMa = makeLookupMa(maDict);

  // Detect direction
  const dir = direction ?? (() => {
    const ws = text.split(/\s+/).map(normalize).filter(Boolean);
    let frScore = 0, maScore = 0;
    for (const w of ws) {
      if (frDict[w]) frScore++;
      if (maDict[w]) maScore++;
      if (w.includes("'") && !elisionMap[w.split("'")[0]?.toLowerCase()]) maScore += 0.5;
      if (["le","la","les","un","une","des","je","tu","nous","est","sont","suis","pas","que","qui","dans","j'","l'","c'","d'","n'","s'"].includes(w.toLowerCase())) frScore += 0.5;
    }
    return frScore >= maScore ? "fr-to-mandoa" as Direction : "mandoa-to-fr" as Direction;
  })();

  const tokens = dir === "fr-to-mandoa" ? tokenize(text) : text.split(/(\s+|[.,;:!?]+)/).filter(Boolean);
  const words: TranslationResult["words"] = [];
  const outputParts: string[] = [];
  const isPronoun = (w: string) => ["ni","gar","kaysh","mhi","val"].includes(w.toLowerCase());

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (/^[\s.,;:!?]+$/.test(token)) {
      outputParts.push(token);
      i++;
      continue;
    }

    let matched = false;

    if (dir === "fr-to-mandoa") {
      // Expressions multi-mots (4 → 2 mots) : on ne compte que les mots — les
      // espaces sont ignorés et la ponctuation est une frontière infranchissable.
      const wordIdx: number[] = [];
      for (let j = i; j < tokens.length && wordIdx.length < 4; j++) {
        if (/^\s+$/.test(tokens[j])) continue;
        if (/^[.,;:!?]+$/.test(tokens[j])) break;
        wordIdx.push(j);
      }
      for (let n = Math.min(4, wordIdx.length); n >= 2; n--) {
        const phraseNorm = normalize(wordIdx.slice(0, n).map(j => tokens[j]).join(" "));
        if (phraseNorm && frDict[phraseNorm]) {
          const endIdx = wordIdx[n - 1];
          words.push({ original: tokens.slice(i, endIdx + 1).join(""), translated: frDict[phraseNorm], found: true });
          outputParts.push(frDict[phraseNorm]);
          matched = true;
          i = endIdx; // le i++ en fin de boucle passe au token suivant
          break;
        }
      }

      if (!matched) {
        const result = lookupFr(token);
        if (result) {
          let translated = result;
          if (isVerb(result) && outputParts.length > 0) {
            const prev = outputParts[outputParts.length - 1]?.trim();
            if (prev && isPronoun(prev)) translated = conjugateMandoa(result);
          }
          words.push({ original: token, translated, found: true });
          outputParts.push(translated);
        } else {
          words.push({ original: token, translated: token, found: false });
          outputParts.push(token);
        }
      }
    } else {
      // Mando'a -> FR
      let prefix = "";
      let wordToLookup = token;
      if (token.toLowerCase().startsWith("ru ") || token.toLowerCase().startsWith("ru'")) {
        prefix = "(passé) "; wordToLookup = token.slice(2).replace(/^'/, "");
      } else if (token.toLowerCase().startsWith("ven ") || token.toLowerCase().startsWith("ven'")) {
        prefix = "(futur) "; wordToLookup = token.slice(3).replace(/^'/, "");
      }

      const result = lookupMa(wordToLookup);
      if (result) {
        words.push({ original: token, translated: prefix + result, found: true });
        outputParts.push(prefix + result);
      } else {
        words.push({ original: token, translated: token, found: false });
        outputParts.push(token);
      }
    }
    i++;
  }

  return {
    input: text,
    output: outputParts.join(" ").replace(/\s+([.,;:!?])/g, "$1").replace(/\s{2,}/g, " "),
    direction: dir,
    words,
  };
}

export function getStats() {
  return { frToMandoa: Object.keys(baseFrToMandoa).length, mandoaToFr: Object.keys(baseMandoaToFr).length };
}

export { baseFrToMandoa as frToMandoa, baseMandoaToFr as mandoaToFr };
