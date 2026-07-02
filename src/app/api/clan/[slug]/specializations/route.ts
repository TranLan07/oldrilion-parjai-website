import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  const specs = await prisma.specialization.findMany({
    where: {
      clanId: clan.id,
      // Freemium : spécialisations secrètes masquées si non-premium
      ...(!clan.premium ? { secret: false } : {}),
    },
    orderBy: { order: "asc" },
  });
  // Freemium : masquer la couleur custom si non-premium
  const result = specs.map(s => ({
    ...s,
    color: clan.premium ? s.color : null,
  }));
  return NextResponse.json(result);
}
