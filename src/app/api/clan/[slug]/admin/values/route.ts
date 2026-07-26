import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound, suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CLAN_VALUES, MAX_CLAN_VALUES } from "@/lib/clan-values";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  // Référence les valeurs par défaut si le clan n'en a aucune, pour faciliter l'édition.
  const count = await prisma.clanValue.count({ where: { clanId: clan.id } });
  if (count === 0) {
    await prisma.$transaction(DEFAULT_CLAN_VALUES.map((v, i) =>
      prisma.clanValue.create({ data: { clanId: clan.id, title: v.title, description: v.description, order: i } })
    ));
  }

  const values = await prisma.clanValue.findMany({
    where: { clanId: clan.id },
    orderBy: { order: "asc" },
    select: { id: true, title: true, description: true, color: true, order: true },
  });
  return NextResponse.json({ premium: clan.premium, values });
}

// PUT : remplace l'ensemble des valeurs du clan (max 6). Couleur custom = premium.
export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const { values } = await req.json();
  if (!Array.isArray(values)) return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  if (values.length > MAX_CLAN_VALUES) return NextResponse.json({ error: `Maximum ${MAX_CLAN_VALUES} valeurs.` }, { status: 400 });

  const clean = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const title = typeof v.title === "string" ? v.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Chaque valeur doit avoir un titre." }, { status: 400 });
    // Couleur custom réservée aux clans premium ; sinon null (=> couleur accent du clan).
    const color = clan.premium && typeof v.color === "string" && v.color.trim() ? v.color.trim() : null;
    clean.push({ clanId: clan.id, title, description: typeof v.description === "string" ? v.description.trim() : "", color, order: i });
  }

  await prisma.$transaction([
    prisma.clanValue.deleteMany({ where: { clanId: clan.id } }),
    ...clean.map(c => prisma.clanValue.create({ data: c })),
  ]);

  const saved = await prisma.clanValue.findMany({ where: { clanId: clan.id }, orderBy: { order: "asc" }, select: { id: true, title: true, description: true, color: true, order: true } });
  return NextResponse.json({ success: true, values: saved });
}
