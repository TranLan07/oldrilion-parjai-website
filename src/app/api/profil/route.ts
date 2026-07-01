import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, displayName: true, username: true,
      publicId: true, hubRole: true, anonymous: true,
      role: true, grade: true, specialization: true,
      permissionLevel: true,
      clan: { select: { id: true, slug: true, name: true, colorPrimary: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { displayName, anonymous } = await req.json();
  const data: Record<string, unknown> = {};
  if (displayName !== undefined && displayName.trim()) data.displayName = displayName.trim();
  if (anonymous !== undefined) data.anonymous = Boolean(anonymous);

  const user = await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ success: true, anonymous: user.anonymous });
}
