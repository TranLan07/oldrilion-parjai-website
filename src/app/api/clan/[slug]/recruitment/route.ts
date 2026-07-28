import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";
import { getRecruitmentFields } from "@/lib/recruitment-fields";

type P = { params: Promise<{ slug: string }> };

// GET public : configuration du formulaire (spés non-secrètes + champs par défaut/custom unifiés).
export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const [specs, grades, fields] = await Promise.all([
    prisma.specialization.findMany({
      where: { clanId: clan.id, secret: false }, // jamais les spés secrètes
      select: { id: true, name: true, description: true },
      orderBy: { order: "asc" },
    }),
    prisma.grade.findMany({
      where: { clanId: clan.id },
      select: { name: true },
      orderBy: { order: "asc" },
    }),
    getRecruitmentFields(clan),
  ]);

  return NextResponse.json({
    clanName: clan.name,
    colorBg: clan.colorBg,
    colorPrimary: clan.colorPrimary,
    colorAccent: clan.colorAccent,
    premium: clan.premium,
    specializations: specs,
    grades: grades.map(g => g.name),
    fields,
  });
}

// POST public : soumission d'une candidature (non connecté ou sans-clan).
export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const body = await req.json();
  const { rpName, discord, customAnswers } = body;
  if (!rpName?.trim() || !discord?.trim()) {
    return NextResponse.json({ error: "Nom RP et Discord sont requis" }, { status: 400 });
  }

  // Si le candidat est connecté, on lie sa candidature à son compte existant.
  // Un utilisateur déjà membre d'un clan ne peut pas candidater.
  const session = await auth();
  let applicantId: string | null = null;
  if (session?.user?.id) {
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, clanId: true } });
    if (me?.clanId) {
      return NextResponse.json({ error: "Vous appartenez déjà à un clan." }, { status: 400 });
    }
    applicantId = me?.id ?? null;
  }

  const fields = await getRecruitmentFields(clan);
  const provided: Record<string, string> = {};
  if (Array.isArray(customAnswers)) {
    for (const a of customAnswers) {
      if (a && typeof a.id === "string") provided[a.id] = typeof a.value === "string" ? a.value : String(a.value ?? "");
    }
  }

  // Champs "clés" (spécialisation / expérience / motivation) : peuvent avoir été renommés,
  // rendus optionnels, réordonnés ou supprimés par l'admin dans le form builder.
  const byKey: Record<string, (typeof fields)[number] | undefined> = {
    specialization: fields.find(f => f.key === "specialization"),
    experience: fields.find(f => f.key === "experience"),
    motivation: fields.find(f => f.key === "motivation"),
  };
  const keyedValues: Record<string, string> = { specialization: "", experience: "", motivation: "" };
  for (const key of ["specialization", "experience", "motivation"] as const) {
    const f = byKey[key];
    if (!f) continue; // supprimé du formulaire par l'admin : on n'en tient pas compte
    const val = (provided[f.id] ?? "").trim();
    if (f.required && !val) {
      return NextResponse.json({ error: `Le champ « ${f.label} » est requis` }, { status: 400 });
    }
    keyedValues[key] = val;
  }

  // Champs custom (sans clé) : uniquement pertinents pour les clans premium ayant personnalisé le formulaire.
  const answers: Array<{ label: string; value: string }> = [];
  for (const f of fields.filter(f => !f.key)) {
    const val = provided[f.id] ?? "";
    if (f.required && !val.trim()) {
      return NextResponse.json({ error: `Le champ « ${f.label} » est requis` }, { status: 400 });
    }
    answers.push({ label: f.label, value: val });
  }

  const recruitment = await prisma.recruitment.create({
    data: {
      clanId: clan.id,
      rpName: rpName.trim(),
      discord: discord.trim(),
      experience: keyedValues.experience,
      motivation: keyedValues.motivation,
      specialization: keyedValues.specialization,
      customAnswers: JSON.stringify(answers),
      applicantId,
    },
  });
  return NextResponse.json({ success: true, id: recruitment.id });
}
