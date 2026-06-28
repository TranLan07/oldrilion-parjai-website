import { extendedFrToMandoa, extendedMandoaToFr } from "./dictionary-extended";

const baseFrToMandoa: Record<string, string> = {
  // --- Pronoms ---
  "je": "ni", "moi": "ni", "tu": "gar", "toi": "gar", "vous": "gar",
  "il": "kaysh", "elle": "kaysh", "lui": "kaysh",
  "nous": "mhi", "ils": "val", "elles": "val", "eux": "val",
  "mon": "ner", "ma": "ner", "mes": "ner",
  "ton": "gar", "ta": "gar", "tes": "gar",
  "son": "kaysh", "sa": "kaysh", "ses": "kaysh",
  "notre": "cuun", "nos": "cuun", "leur": "val", "leurs": "val",

  // --- Famille & Relations ---
  "père": "buir", "mère": "buir", "parent": "buir",
  "fils": "ad", "fille": "ad", "enfant": "ad",
  "enfants": "ade", "grand-père": "ba'buir", "grand-mère": "ba'buir",
  "oncle": "ba'vodu", "tante": "ba'vodu",
  "frère": "vod", "sœur": "vod", "soeur": "vod",
  "famille": "aliit", "clan": "aliit",
  "ami": "burc'ya", "amie": "burc'ya",
  "époux": "riduur", "épouse": "riduur", "mari": "riduur", "femme": "dala",
  "bébé": "ik'aad", "petit-fils": "bu'ad", "petite-fille": "bu'ad",

  // --- Guerre & Combat ---
  "guerre": "akaan", "combat": "akaanir", "combattre": "akaanir",
  "guerrier": "verd", "guerriers": "verde",
  "soldat": "verd", "soldats": "verde",
  "armée": "akaan'ade", "bataillon": "akaata",
  "assassin": "kyramud", "tueur": "kyramud",
  "chasseur de primes": "beroya",
  "attaque": "jurkad", "attaquer": "jurkadir",
  "défendre": "ara'novor", "défense": "aranar",
  "victoire": "parjai", "vaincre": "kotir",
  "mort": "kyr'am", "tuer": "kyr'amur", "mourir": "ramaanar",
  "armes": "besbe'trayce", "blaster": "tracy'uur",
  "sabre": "kad", "épée": "kad",
  "sabre laser": "kad'au", "grenade": "goore",
  "sniper": "ram'ser", "tireur d'élite": "ram'ser",
  "commando": "ramikad", "escouade": "traat'aliit",
  "assaut": "jurkad", "raid": "ram'ika",
  "mission": "aka", "cible": "lenedat",
  "ennemi": "aru'e", "ennemis": "aruetiise",
  "allié": "tomad", "alliance": "tom",
  "trahir": "aruetii", "traître": "aruetii",
  "danger": "buruk", "dangereux": "burk'yc",
  "garde": "aran", "protecteur": "cabur",
  "forteresse": "keldab", "citadelle": "keldab",

  // --- Armure & Équipement ---
  "armure": "beskar'gam", "casque": "buy'ce",
  "fer mandalorien": "beskar", "beskar": "beskar",
  "blindé": "beskaryc", "bottes": "cetare",
  "gant": "kom'rk", "ceinture": "kama",
  "jetpack": "sen'tra",

  // --- Corps ---
  "tête": "kovid", "main": "gaan", "bras": "irud",
  "cœur": "kar'ta", "coeur": "kar'ta",
  "os": "taakur", "sang": "tal", "peau": "pel'gam",
  "yeux": "sur'haai", "bouche": "uram",
  "cerveau": "mirshe", "dents": "edee",
  "estomac": "epan", "genou": "lovik",

  // --- Émotions & États ---
  "colère": "a'den", "rage": "a'den",
  "peur": "chaab", "courage": "mirshko",
  "honneur": "ijaat", "gloire": "kote",
  "haine": "or'parguur", "amour": "kar'taylir darasuum",
  "espoir": "vercopa", "souffrance": "aaray",
  "deuil": "echoy", "joie": "briikase",
  "heureux": "briikase", "triste": "trikar'la",
  "en colère": "kaden'la",

  // --- Verbes communs ---
  "être": "cuyir", "exister": "cuyir",
  "avoir": "ganar", "pouvoir": "liser",
  "vouloir": "copaanir", "devoir": "enteyor",
  "aimer": "emuurir", "détester": "paguur",
  "parler": "jorhaa'ir", "dire": "sirbur",
  "savoir": "kar'taylir", "connaître": "kar'taylir",
  "voir": "haa'taylir", "regarder": "haa'taylir",
  "écouter": "sushir", "entendre": "susulur",
  "manger": "epar", "boire": "pirur",
  "dormir": "nuhoyir", "vivre": "oyacyir",
  "aller": "slanar", "venir": "olaror",
  "partir": "ba'slanar", "courir": "viinir",
  "trouver": "mar'eyir", "chercher": "echoylir",
  "donner": "dinuir", "prendre": "hibir",
  "faire": "gotal'ur", "créer": "gotal'ur",
  "porter": "jurir", "tenir": "jurir",
  "croire": "urmankalar", "penser": "mirdir",
  "essayer": "kebbur", "accepter": "vorer",
  "survivre": "cuyanir", "protéger": "cabuor",
  "brûler": "hettir", "couper": "hokaanir",
  "fuir": "eyaytir", "marcher": "kemir",
  "respirer": "haalur", "oublier": "digur",
  "gagner": "parjir", "perdre": "trattok'or",
  "forger": "goran",

  // --- Adjectifs ---
  "bon": "jate", "mauvais": "dush",
  "fort": "dral", "faible": "diryc",
  "grand": "ori", "petit": "kih",
  "vieux": "ruug'la", "jeune": "evaar'la",
  "rapide": "iviin'yc", "lent": "skotah",
  "dur": "atin'la", "froid": "ciryc",
  "chaud": "nadala", "sombre": "dha",
  "brillant": "dral", "beau": "mesh'la",
  "brave": "kotep", "lâche": "hut'uun",
  "stupide": "di'kutla", "intelligent": "mirdala",
  "vivant": "oya'la",
  "vrai": "veman", "faux": "jehaat",
  "éternel": "darasuum", "nouveau": "evaar'la",
  "libre": "mav", "loyal": "verburyc",
  "fatal": "kyramla",
  "hostile": "aru'ela", "sacré": "kandosii",

  // --- Lieux & Directions ---
  "nord": "gaht", "sud": "ka'gaht",
  "est": "abesh", "ouest": "wasuur",
  "maison": "yaim", "ville": "oriya",
  "forêt": "kurs", "montagne": "cerar",
  "espace": "tra", "planète": "me'suum",
  "ciel": "kebii'tra", "étoiles": "ka'ra",
  "terre": "vheh", "eau": "pirun",
  "route": "goyust", "champ de bataille": "kyrbej",

  // --- Temps ---
  "jour": "tuur", "nuit": "ca",
  "demain": "nakar'tuur", "maintenant": "jii",
  "toujours": "ratiin", "jamais": "draar",
  "temps": "ca'nara",

  // --- Nombres ---
  "un": "solus", "deux": "t'ad", "trois": "ehn",
  "quatre": "cuir", "cinq": "rayshe'a",
  "six": "resol", "sept": "e'tad",
  "huit": "sh'ehn", "neuf": "she'cu",
  "dix": "ta'raysh", "cent": "olan",

  // --- Nourriture & Boisson ---
  "bière": "gal", "alcool": "gal",
  "nourriture": "skraan", "pain": "shun",
  "viande": "loras", "soupe": "pirpaak",

  // --- Expressions & Salutations ---
  "bonjour": "Su cuy'gar", "salut": "Su'cuy",
  "au revoir": "Ret'urcye mhi",
  "merci": "Vor'e", "s'il vous plaît": "gedet'ye",
  "oui": "elek", "non": "nayc",
  "attention": "K'uur",
  "désolé": "N'eparavu takisit",

  // --- Concepts ---
  "force": "kot", "destin": "jate'kara",
  "vérité": "haat", "mensonge": "jehaat",
  "forgeron": "goran", "stratège": "mirdala",
  "paix": "naak", "justice": "tor",
  "feu": "tracyn", "flamme": "tracinya",
  "ombre": "prudii", "lumière": "nau'ul",
  "musique": "bes'laar", "chanson": "laar",

  // --- Titres & Rangs ---
  "chef": "alor", "capitaine": "alor'ad",
  "lieutenant": "ver'alor", "sergent": "ruus'alor",
  "commandeur": "al'verde",

  // --- Mots grammaticaux ---
  "et": "bal", "mais": "a", "ou": "ra",
  "dans": "lo", "sur": "bat", "sous": "chur",
  "avec": "ti", "de": "be", "pour": "par",
  "le": "te", "la": "te", "les": "te",
  "ne pas": "nu", "ne plus": "dar",
  "où": "vaii", "quand": "tion'tuur",
  "qui": "tion'ad", "pourquoi": "tion'jor",
  "comment": "tion'solet", "combien": "tion'solet",

  // --- Dictons célèbres (clés) ---
  "le clan est plus que le sang": "Aliit ori'shya tal'din",
  "mandalorien": "Mando",
  "mandaloriens": "Mando'ade",
};

// Merge base + extended (base takes priority)
export const frToMandoa: Record<string, string> = { ...extendedFrToMandoa, ...baseFrToMandoa };

export const mandoaToFr: Record<string, string> = { ...extendedMandoaToFr };

// Build reverse dictionary from frToMandoa
for (const [fr, ma] of Object.entries(frToMandoa)) {
  const key = ma.toLowerCase();
  if (!mandoaToFr[key]) {
    mandoaToFr[key] = fr;
  }
}

// Add specific Mando'a -> FR entries that are important
Object.assign(mandoaToFr, {
  "ni": "je/moi",
  "gar": "tu/toi/vous",
  "kaysh": "il/elle/lui",
  "mhi": "nous",
  "val": "ils/elles/eux",
  "ner": "mon/ma/mes",
  "cuun": "notre/nos",
  "buir": "père/mère/parent",
  "ad": "fils/fille/enfant",
  "ade": "enfants",
  "vod": "frère/sœur",
  "aliit": "clan/famille",
  "beskar": "fer mandalorien",
  "beskar'gam": "armure",
  "parjai": "victoire",
  "kyr'am": "mort",
  "akaan": "guerre",
  "verd": "guerrier/soldat",
  "verde": "guerriers/soldats",
  "dha": "sombre/secret",
  "alor": "chef/dirigeant",
  "mando": "mandalorien",
  "mando'ade": "mandaloriens/fils de Mandalore",
  "cuyir": "être/exister",
  "jorhaa'ir": "parler/discuter",
  "kar'taylir": "savoir/connaître",
  "kar'taylir darasuum": "aimer (litt. savoir pour toujours)",
  "emuurir": "aimer/apprécier",
  "goran": "forgeron/métallurgiste",
  "mirdala": "intelligent/stratège",
  "kyramud": "assassin/tueur",
  "beroya": "chasseur de primes",
  "kandosii": "indomptable/impitoyable",
  "darasuum": "éternel/pour toujours",
  "resol'nare": "les Six Actions (code mandalorien)",
  "su cuy'gar": "bonjour (litt. tu es encore en vie)",
  "ret'urcye mhi": "au revoir (litt. à notre prochaine rencontre)",
  "vor'e": "merci (litt. j'accepte une dette)",
  "oya": "allons-y / hourra",
  "oya manda": "expression de solidarité mandalorienne",
  "aliit ori'shya tal'din": "le clan est plus que le sang",
  "ke'mot !": "halte !",
  "k'oyacyi !": "bravo ! (litt. vis !)",
  "usen'ye !": "dégage !",
  "haar'chak !": "bon sang !",
  "jate": "bon",
  "dush": "mauvais",
  "ori": "grand/très",
  "kih": "petit",
  "haat": "vérité",
  "tracyn": "feu",
  "prudii": "ombre",
  "prudii'se": "ombres",
  "tal": "sang",
  "ijaat": "honneur",
  "kote": "gloire",
  "kot": "force",
});
