import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") || "standard";
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;

  if (mode === "dha") {
    if (perm < 7) {
      return NextResponse.json({ error: "Accès Dha requis (niveau 7)" }, { status: 403 });
    }
    const missions = await prisma.mission.findMany({
      where: { confidentiality: { in: ["secret", "top_secret"] } },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, role: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(missions);
  }

  const missions = await prisma.mission.findMany({
    where: { confidentiality: "standard" },
    include: {
      members: { include: { user: { select: { id: true, displayName: true, role: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(missions);
}
