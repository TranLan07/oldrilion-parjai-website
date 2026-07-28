import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound, suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";
import { getRecruitmentFields } from "@/lib/recruitment-fields";

type P = { params: Promise<{ slug: string }> };

// "specialization" / "grade" : listes auto-alimentées par les spés/grades du clan.
const TYPES = ["text", "textarea", "checkbox", "radio", "specialization", "grade"];
const KEYS = ["specialization", "experience", "motivation"];
const MAX_FIELDS = 13; // 3 champs "par défaut" (renommables/supprimables) + 10 champs custom
const MAX_OPTIONS = 5;

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const fields = await getRecruitmentFields(clan);
  return NextResponse.json({ premium: clan.premium, fields });
}

// PUT : remplace l'ensemble des champs du formulaire (défauts + custom, form builder). Premium requis.
export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  if (!clan.premium) return NextResponse.json({ error: "L'édition du formulaire est une fonctionnalité premium." }, { status: 403 });

  const { fields } = await req.json();
  if (!Array.isArray(fields)) return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  if (fields.length > MAX_FIELDS) return NextResponse.json({ error: `Maximum ${MAX_FIELDS} champs.` }, { status: 400 });

  // Validation + normalisation
  const clean = [];
  const seenKeys = new Set<string>();
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const label = typeof f.label === "string" ? f.label.trim() : "";
    if (!label) return NextResponse.json({ error: "Chaque champ doit avoir un intitulé." }, { status: 400 });
    if (!TYPES.includes(f.type)) return NextResponse.json({ error: `Type de champ invalide : ${f.type}` }, { status: 400 });
    const key = typeof f.key === "string" && KEYS.includes(f.key) ? f.key : null;
    if (key) {
      if (seenKeys.has(key)) return NextResponse.json({ error: `Le champ « ${key} » ne peut apparaître qu'une fois.` }, { status: 400 });
      seenKeys.add(key);
    }
    let options: string[] = [];
    if (f.type === "radio" || f.type === "checkbox") {
      options = Array.isArray(f.options) ? f.options.map((o: unknown) => String(o).trim()).filter(Boolean).slice(0, MAX_OPTIONS) : [];
      if (options.length === 0) return NextResponse.json({ error: `Le champ « ${label} » doit avoir au moins une option.` }, { status: 400 });
    }
    clean.push({ clanId: clan.id, key, label, type: f.type, options: JSON.stringify(options), required: !!f.required, order: i });
  }

  // Remplacement atomique
  await prisma.$transaction([
    prisma.recruitmentField.deleteMany({ where: { clanId: clan.id } }),
    ...clean.map(c => prisma.recruitmentField.create({ data: c })),
    prisma.clan.update({ where: { id: clan.id }, data: { recruitmentFormCustomized: true } }),
  ]);

  const fresh = await getRecruitmentFields({ ...clan, recruitmentFormCustomized: true });
  return NextResponse.json({ success: true, fields: fresh });
}
