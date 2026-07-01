import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// PUT: toggle in-app notif pour un canal
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { channelId, inAppNotif } = await req.json();
  if (!channelId || typeof inAppNotif !== "boolean") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  await prisma.channelMember.updateMany({
    where: { userId: session.user.id, channelId },
    data: { inAppNotif },
  });

  return NextResponse.json({ ok: true });
}

// POST: s'abonner aux emails d'un canal
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { channelId, email } = await req.json();
  if (!channelId || !email?.includes("@")) {
    return NextResponse.json({ error: "channelId et email valide requis" }, { status: 400 });
  }

  // Vérifier que l'utilisateur est membre du canal
  const member = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId } },
  });
  if (!member) return NextResponse.json({ error: "Vous n'êtes pas membre de ce canal" }, { status: 403 });

  const confirmToken = crypto.randomBytes(24).toString("hex");
  await prisma.channelFollower.upsert({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    create: { userId: session.user.id, channelId, email, confirmToken, confirmed: true },
    update: { email, confirmed: true },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: se désabonner des emails d'un canal
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { channelId } = await req.json();
  await prisma.channelFollower.deleteMany({
    where: { userId: session.user.id, channelId },
  });

  return NextResponse.json({ ok: true });
}
