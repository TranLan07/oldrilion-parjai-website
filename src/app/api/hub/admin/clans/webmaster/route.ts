import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";

export async function POST(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();

  const { clanId } = await req.json();
  if (!clanId) return NextResponse.json({ error: "clanId requis" }, { status: 400 });

  // Trouver le webmaster du clan (permissionLevel 10, role admin)
  const webmaster = await prisma.user.findFirst({
    where: { clanId, role: "admin", permissionLevel: 10 },
    orderBy: { createdAt: "asc" },
  });

  if (!webmaster) {
    return NextResponse.json({ error: "Aucun webmaster trouvé pour ce clan" }, { status: 404 });
  }

  // Générer un nouveau mot de passe temporaire
  const newPassword = Math.random().toString(36).slice(2, 10);
  await prisma.user.update({
    where: { id: webmaster.id },
    data: { passwordHash: hashSync(newPassword, 10), mustChangePassword: true },
  });

  return NextResponse.json({ username: webmaster.username, password: newPassword });
}
