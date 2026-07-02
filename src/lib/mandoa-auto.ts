import { prisma } from "./prisma";
import { translate } from "./translator";

const CONSONANTS = ["b", "c", "d", "g", "k", "m", "n", "r", "s", "t", "v", "sh", "dr", "tr", "kr"];
const VOWELS = ["a", "e", "i", "o", "u", "ar", "ir", "or", "al"];
const SUFFIXES = ["", "'ir", "'e", "ir", "e", "an", "'al"];

function generateWord(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const c1 = CONSONANTS[hash % CONSONANTS.length];
  const v1 = VOWELS[(hash >> 4) % VOWELS.length];
  const c2 = CONSONANTS[(hash >> 8) % CONSONANTS.length];
  const v2 = VOWELS[(hash >> 12) % VOWELS.length];
  const suf = SUFFIXES[(hash >> 16) % SUFFIXES.length];
  return c1 + v1 + c2 + v2 + suf;
}

export async function translateWithAutoGenerate(text: string): Promise<string> {
  // Charger les entrées custom depuis la DB
  const entries = await prisma.dictionaryEntry.findMany({ select: { french: true, mandoa: true } });
  const customFr: Record<string, string> = {};
  for (const e of entries) customFr[e.french.toLowerCase()] = e.mandoa;

  const result = translate(text, "fr-to-mandoa", customFr);

  // Pour chaque mot non trouvé, générer et sauvegarder
  const toCreate: Array<{ french: string; mandoa: string }> = [];
  const existingMandoa = new Set(Object.values(customFr));

  for (const w of result.words) {
    if (!w.found && w.original.trim() && /^[a-zA-ZÀ-ÿ]+$/.test(w.original)) {
      const key = w.original.toLowerCase();
      if (!customFr[key]) {
        let generated = generateWord(key);
        // Éviter les collisions
        let attempt = 0;
        while (existingMandoa.has(generated)) {
          generated = generateWord(key + attempt++);
        }
        existingMandoa.add(generated);
        customFr[key] = generated;
        toCreate.push({ french: key, mandoa: generated });
      }
    }
  }

  if (toCreate.length > 0) {
    for (const e of toCreate) {
      await prisma.dictionaryEntry.upsert({
        where: { french: e.french },
        create: { french: e.french, mandoa: e.mandoa, isAuto: true },
        update: {},
      });
    }
  }

  // Retraduit avec les nouveaux mots
  if (toCreate.length > 0) {
    const result2 = translate(text, "fr-to-mandoa", customFr);
    return result2.output;
  }
  return result.output;
}
