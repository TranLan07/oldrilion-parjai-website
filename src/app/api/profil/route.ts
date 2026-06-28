import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, displayName: true, username: true, role: true,
      grade: true, specialization: true, publicSpecialization: true,
      permissionLevel: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { publicSpecialization } = await req.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { publicSpecialization: publicSpecialization || "" },
  });

  return NextResponse.json({ success: true });
}
