import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { newPassword } = await req.json();
  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json({ error: "Mot de passe trop court (min 4)" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: hashSync(newPassword, 10),
      mustChangePassword: false,
    },
  });

  return NextResponse.json({ success: true });
}
