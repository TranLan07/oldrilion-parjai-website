import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const mode = req.nextUrl.searchParams.get("mode") || "standard";

  if (mode === "dha") {
    if (perm < 7) return NextResponse.json({ error: "Accès Dha requis (niveau 7)" }, { status: 403 });
    const missions = await prisma.mission.findMany({
      where: { clanId: clan.id, confidentiality: { in: ["secret", "top_secret"] } },
      include: { members: { include: { user: { select: { id: true, displayName: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(missions);
  }

  const missions = await prisma.mission.findMany({
    where: { clanId: clan.id, confidentiality: "standard" },
    include: { members: { include: { user: { select: { id: true, displayName: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(missions);
}
