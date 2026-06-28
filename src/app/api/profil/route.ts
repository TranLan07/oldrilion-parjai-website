import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
