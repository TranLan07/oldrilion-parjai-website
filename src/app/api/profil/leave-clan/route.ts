import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// L'utilisateur quitte son clan : réinitialisation de ses champs liés au clan.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clanId: true } });
  if (!user?.clanId) return NextResponse.json({ error: "Vous n'appartenez à aucun clan." }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      clanId: null,
      gradeId: null,
      specializationId: null,
      role: "membre",
      grade: "Recrue",
      specialization: "",
      publicSpecialization: "",
      permissionLevel: 1,
      mandalorien: false,
    },
  });

  return NextResponse.json({ success: true });
}
