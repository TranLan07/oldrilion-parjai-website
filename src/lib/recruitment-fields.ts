import { prisma } from "@/lib/prisma";

export type RecruitmentFieldDTO = {
  id: string;
  key: "specialization" | "experience" | "motivation" | null;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  order: number;
};

// Les 3 champs par défaut, tels qu'ils existaient historiquement en dur dans le formulaire.
// Tant que l'admin n'a jamais enregistré le form builder, on les synthétise (non persistés)
// pour préserver le comportement actuel. Dès le premier enregistrement, ce sont les lignes
// réellement sauvegardées (RecruitmentField) qui font foi — l'admin peut les renommer,
// réordonner ou supprimer comme n'importe quel champ custom.
export const DEFAULT_KEYED_FIELDS: Omit<RecruitmentFieldDTO, "id">[] = [
  { key: "specialization", label: "Spécialisation souhaitée", type: "specialization", options: [], required: false, order: 0 },
  { key: "experience", label: "Expérience RP", type: "textarea", options: [], required: true, order: 1 },
  { key: "motivation", label: "Motivation", type: "textarea", options: [], required: true, order: 2 },
];

function safeJson(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

// Renvoie la liste unifiée (défauts + custom) telle qu'elle doit être affichée/validée.
// Les clans non-premium (ou premium n'ayant jamais personnalisé le formulaire) reçoivent
// toujours les 3 défauts synthétiques — le builder premium est le seul moyen de les changer.
export async function getRecruitmentFields(clan: { id: string; premium: boolean; recruitmentFormCustomized: boolean }): Promise<RecruitmentFieldDTO[]> {
  if (!clan.premium || !clan.recruitmentFormCustomized) {
    return DEFAULT_KEYED_FIELDS.map(f => ({ ...f, id: `default-${f.key}` }));
  }
  const rows = await prisma.recruitmentField.findMany({ where: { clanId: clan.id }, orderBy: { order: "asc" } });
  return rows.map(r => ({
    id: r.id,
    key: (r.key as RecruitmentFieldDTO["key"]) ?? null,
    label: r.label, type: r.type, options: safeJson(r.options), required: r.required, order: r.order,
  }));
}
