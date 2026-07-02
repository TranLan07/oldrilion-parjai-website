import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const session = await auth();
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const userId = session?.user?.id;
  const userPerm = userId
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { permissionLevel: true, clanId: true } }))
    : null;
  const effectivePerm = userPerm?.clanId === clan.id ? (userPerm?.permissionLevel ?? 0) : 0;

  // Check page permission
  const pp = await prisma.pagePermission.findUnique({ where: { clanId_path: { clanId: clan.id, path: "diplomatie" } } });
  const minPerm = pp?.minPermission ?? 1;
  if (effectivePerm < minPerm && minPerm > 1) {
    if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    // Public (minPerm <= 1) → toujours accessible
  }

  const entries = await prisma.diplomacyEntry.findMany({
    where: { clanId: clan.id },
    include: {
      targetClan: { select: { id: true, name: true, slug: true, colorPrimary: true } },
      tags: clan.premium ? true : false,
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const sanitized = entries.map(e => ({
    ...e,
    tags: clan.premium ? e.tags : [],
  }));

  return NextResponse.json({ entries: sanitized, premium: clan.premium });
}
