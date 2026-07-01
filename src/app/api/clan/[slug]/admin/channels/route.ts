import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const channels = await prisma.channel.findMany({
    where: { clanId: clan.id },
    include: {
      members: { select: { muted: true, user: { select: { id: true, displayName: true, grade: true, specialization: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(channels);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const { name, description, isPrivate, memberIds, grades, specializations } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const userIdSet = new Set<string>(memberIds || []);
  if (grades?.length) {
    const users = await prisma.user.findMany({ where: { clanId: clan.id, grade: { in: grades } }, select: { id: true } });
    users.forEach(u => userIdSet.add(u.id));
  }
  if (specializations?.length) {
    const users = await prisma.user.findMany({ where: { clanId: clan.id, specialization: { in: specializations } }, select: { id: true } });
    users.forEach(u => userIdSet.add(u.id));
  }

  const channel = await prisma.channel.create({
    data: {
      clanId: clan.id, name, description: description || "", isPrivate: isPrivate || false,
      members: userIdSet.size > 0 ? { create: Array.from(userIdSet).map(userId => ({ userId })) } : undefined,
    },
  });
  return NextResponse.json(channel);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id, action, userId, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  if (action === "addMember" && userId) {
    await prisma.channelMember.upsert({ where: { userId_channelId: { userId, channelId: id } }, create: { channelId: id, userId }, update: {} });
    return NextResponse.json({ success: true });
  }
  if (action === "removeMember" && userId) {
    await prisma.channelMember.deleteMany({ where: { channelId: id, userId } });
    return NextResponse.json({ success: true });
  }
  await prisma.channel.update({ where: { id }, data: { ...(data.name && { name: data.name }), ...(data.description !== undefined && { description: data.description }), ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }) } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id } = await req.json();
  await prisma.channel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
