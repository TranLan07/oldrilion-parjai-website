import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_NOTIF = ["all", "clan_only", "global_only", "none"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      anonymous: true,
      notifMissions: true,
      notifEvents: true,
      channelMembers: {
        include: {
          channel: {
            select: {
              id: true, name: true, description: true, clanId: true,
              clan: { select: { name: true, colorPrimary: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Pour chaque canal membre, récupérer le ChannelFollower (email notif)
  const channelIds = user.channelMembers.map(m => m.channelId);
  const followers = await prisma.channelFollower.findMany({
    where: { userId: session.user.id, channelId: { in: channelIds } },
    select: { channelId: true, email: true, confirmed: true },
  });
  const followerMap = Object.fromEntries(followers.map(f => [f.channelId, f]));

  const channels = user.channelMembers.map(m => ({
    channelId: m.channelId,
    channelName: m.channel.name,
    channelDesc: m.channel.description,
    clanId: m.channel.clanId,
    clan: m.channel.clan,
    inAppNotif: m.inAppNotif,
    emailFollow: followerMap[m.channelId] ?? null,
    muted: m.muted,
  }));

  return NextResponse.json({
    anonymous: user.anonymous,
    notifMissions: user.notifMissions,
    notifEvents: user.notifEvents,
    channels,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.anonymous === "boolean") data.anonymous = body.anonymous;
  if (body.notifMissions && VALID_NOTIF.includes(body.notifMissions)) data.notifMissions = body.notifMissions;
  if (body.notifEvents && VALID_NOTIF.includes(body.notifEvents)) data.notifEvents = body.notifEvents;

  await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true });
}
