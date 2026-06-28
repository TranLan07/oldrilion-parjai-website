import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendMail } from "@/lib/mail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const { email } = await req.json();
  if (!email?.includes("@")) return NextResponse.json({ error: "Email invalide" }, { status: 400 });

  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });
  if (!channel.emailNotifEnabled) return NextResponse.json({ error: "Les notifications email sont désactivées sur ce canal" }, { status: 400 });

  const existing = await prisma.channelFollower.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId: id } },
  });
  if (existing?.confirmed) return NextResponse.json({ error: "Vous suivez déjà ce canal" }, { status: 400 });

  const token = randomBytes(32).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;

  await prisma.channelFollower.upsert({
    where: { userId_channelId: { userId: session.user.id, channelId: id } },
    create: { email, userId: session.user.id, channelId: id, confirmToken: token },
    update: { email, confirmToken: token, confirmed: false },
  });

  const confirmUrl = `${baseUrl}/api/channels/confirm?token=${token}`;

  await sendMail(
    email,
    `Parjai — Confirmer le suivi du canal #${channel.name}`,
    `<div style="font-family:sans-serif;color:#e8e6e3;background:#0a0a0f;padding:32px;border-radius:8px;">
      <h2 style="color:#c9a84c;">Clan Parjai — Suivi du canal #${channel.name}</h2>
      <p>Vous avez demandé à recevoir les messages du canal <strong>#${channel.name}</strong> par email.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#c9a84c;color:#0a0a0f;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Confirmer le suivi</a></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>`
  );

  return NextResponse.json({ success: true, message: "Email de confirmation envoyé" });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  await prisma.channelFollower.deleteMany({ where: { userId: session.user.id, channelId: id } });
  return NextResponse.json({ success: true });
}
