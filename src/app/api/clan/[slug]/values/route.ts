import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";
import { DEFAULT_CLAN_VALUES } from "@/lib/clan-values";

type P = { params: Promise<{ slug: string }> };

// GET public : valeurs affichées sur l'accueil du clan.
// color null => l'accueil utilise la couleur accent du clan.
export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const values = await prisma.clanValue.findMany({
    where: { clanId: clan.id },
    orderBy: { order: "asc" },
    select: { id: true, title: true, description: true, color: true, order: true },
  });

  // Aucune valeur custom : on renvoie les valeurs par défaut (couleur accent).
  if (values.length === 0) {
    return NextResponse.json(DEFAULT_CLAN_VALUES.map((v, i) => ({ id: `default-${i}`, title: v.title, description: v.description, color: null, order: i })));
  }
  return NextResponse.json(values);
}
