import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendMail } from "@/lib/mail";
import { resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { slug, id } = await params;
  const { email } = await req.json();
  if (!email?.includes("@")) return NextResponse.json({ error: "Email invalide" }, { status: 400 });

  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel || channel.clanId !== clan.id) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });
  if (!channel.emailNotifEnabled) return NextResponse.json({ error: "Notifications désactivées sur ce canal" }, { status: 400 });

  // Canal privé : seuls les membres du canal peuvent le suivre par email
  if (channel.isPrivate) {
    const member = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: session.user.id, channelId: id } },
    });
    if (!member) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

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
    `Hub Mandalorien — Confirmer le suivi du canal #${channel.name}`,
    `<div style="font-family:sans-serif;color:#e8e6e3;background:#0a0a0f;padding:32px;border-radius:8px;">
      <h2 style="color:#c9a84c;">Hub Mandalorien — Canal #${channel.name}</h2>
      <p>Confirmez votre suivi du canal <strong>#${channel.name}</strong>.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#c9a84c;color:#0a0a0f;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Confirmer le suivi</a></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>`
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { slug, id } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();
  await prisma.channelFollower.deleteMany({ where: { userId: session.user.id, channelId: id } });
  return NextResponse.json({ success: true });
}
