import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

// GET public : configuration du formulaire (spés non-secrètes + champs custom).
export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const specs = await prisma.specialization.findMany({
    where: { clanId: clan.id, secret: false }, // jamais les spés secrètes
    select: { id: true, name: true, description: true },
    orderBy: { order: "asc" },
  });

  // Les champs custom ne sont actifs que pour les clans premium
  const fields = clan.premium
    ? await prisma.recruitmentField.findMany({ where: { clanId: clan.id }, orderBy: { order: "asc" } })
    : [];

  return NextResponse.json({
    clanName: clan.name,
    colorBg: clan.colorBg,
    colorPrimary: clan.colorPrimary,
    colorAccent: clan.colorAccent,
    specializations: specs,
    fields: fields.map(f => ({ id: f.id, label: f.label, type: f.type, options: safeJson(f.options), required: f.required, order: f.order })),
  });
}

// POST public : soumission d'une candidature (non connecté ou sans-clan).
export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const body = await req.json();
  const { rpName, discord, experience, motivation, specialization, customAnswers } = body;
  if (!rpName?.trim() || !discord?.trim() || !experience?.trim() || !motivation?.trim()) {
    return NextResponse.json({ error: "Tous les champs principaux sont requis" }, { status: 400 });
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

  // Valide les champs custom requis (uniquement pour clans premium)
  const answers: Array<{ label: string; value: string }> = [];
  if (clan.premium) {
    const fields = await prisma.recruitmentField.findMany({ where: { clanId: clan.id } });
    const provided: Record<string, string> = {};
    if (Array.isArray(customAnswers)) {
      for (const a of customAnswers) {
        if (a && typeof a.id === "string") provided[a.id] = typeof a.value === "string" ? a.value : String(a.value ?? "");
      }
    }
    for (const f of fields) {
      const val = provided[f.id] ?? "";
      if (f.required && !val.trim()) {
        return NextResponse.json({ error: `Le champ « ${f.label} » est requis` }, { status: 400 });
      }
      answers.push({ label: f.label, value: val });
    }
  }

  const recruitment = await prisma.recruitment.create({
    data: {
      clanId: clan.id,
      rpName: rpName.trim(),
      discord: discord.trim(),
      experience: experience.trim(),
      motivation: motivation.trim(),
      specialization: specialization || "",
      customAnswers: JSON.stringify(answers),
      applicantId,
    },
  });
  return NextResponse.json({ success: true, id: recruitment.id });
}

function safeJson(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
