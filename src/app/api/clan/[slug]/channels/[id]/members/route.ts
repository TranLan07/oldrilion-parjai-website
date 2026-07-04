import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, denied, resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: P) {
  const { slug, id } = await params;
  if (!(await requireClanAdmin(slug))) return denied();

  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const channel = await prisma.channel.findUnique({ where: { id }, select: { clanId: true } });
  if (!channel || channel.clanId !== clan.id) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

  const { action, userId } = await req.json();

  if (action === "add" && userId) {
    await prisma.channelMember.upsert({
      where: { userId_channelId: { userId, channelId: id } },
      create: { userId, channelId: id },
      update: {},
    });
    return NextResponse.json({ success: true });
  }
  if (action === "remove" && userId) {
    await prisma.channelMember.deleteMany({ where: { userId, channelId: id } });
    return NextResponse.json({ success: true });
  }
  if (action === "mute" && userId) {
    await prisma.channelMember.updateMany({ where: { userId, channelId: id }, data: { muted: true } });
    return NextResponse.json({ success: true });
  }
  if (action === "unmute" && userId) {
    await prisma.channelMember.updateMany({ where: { userId, channelId: id }, data: { muted: false } });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
