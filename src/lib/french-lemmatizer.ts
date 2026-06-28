import conjugations from "french-verbs-lefff/dist/conjugations.json";

const conjugationData = conjugations as Record<string, Record<string, string[]>>;

// Build reverse index: conjugated form -> infinitive(s)
// P=présent, S=subjonctif, I=imparfait, F=futur, C=conditionnel,
// J=passé simple, G=gérondif, K=participe passé, Y=impératif, T=subj imparfait
const reverseIndex: Map<string, string> = new Map();

for (const [infinitive, tenses] of Object.entries(conjugationData)) {
  // Skip reflexive duplicates (uwSe prefix)
  if (infinitive.startsWith("uw")) continue;

  for (const forms of Object.values(tenses)) {
    for (const form of forms) {
      if (form && form !== "NA") {
        const key = form.toLowerCase();
        // Keep the first match (most common verb)
        if (!reverseIndex.has(key)) {
          reverseIndex.set(key, infinitive);
        }
      }
    }
  }
}

/**
 * Given a conjugated French verb form, returns the infinitive.
 * Returns null if not found.
 */
export function lemmatize(word: string): string | null {
  return reverseIndex.get(word.toLowerCase()) || null;
}

/**
 * Returns all possible infinitive forms for a word,
 * including the word itself and common variations.
 */
export function getLemmas(word: string): string[] {
  const w = word.toLowerCase();
  const results: string[] = [w];

  const infinitive = reverseIndex.get(w);
  if (infinitive) results.push(infinitive);

  // Also try without accents
  const noAccent = w
    .replace(/[éèêë]/g, "e").replace(/[àâ]/g, "a")
    .replace(/[ùûü]/g, "u").replace(/[ôö]/g, "o")
    .replace(/[îï]/g, "i").replace(/ç/g, "c");

  if (noAccent !== w) {
    results.push(noAccent);
    const inf2 = reverseIndex.get(noAccent);
    if (inf2) results.push(inf2);
  }

  return [...new Set(results)];
}

export const verbCount = reverseIndex.size;
