import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-check";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const channels = await prisma.channel.findMany({
    include: {
      members: { select: { muted: true, user: { select: { id: true, displayName: true, grade: true, specialization: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { name, description, isPrivate, memberIds, grades, specializations } = await req.json();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  // Collect user IDs from explicit members + grade filter + spec filter
  const userIdSet = new Set<string>(memberIds || []);

  if (grades?.length) {
    const users = await prisma.user.findMany({
      where: { grade: { in: grades } },
      select: { id: true },
    });
    users.forEach(u => userIdSet.add(u.id));
  }

  if (specializations?.length) {
    const users = await prisma.user.findMany({
      where: { specialization: { in: specializations } },
      select: { id: true },
    });
    users.forEach(u => userIdSet.add(u.id));
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      description: description || "",
      isPrivate: isPrivate || false,
      members: userIdSet.size > 0
        ? { create: Array.from(userIdSet).map(userId => ({ userId })) }
        : undefined,
    },
  });

  return NextResponse.json(channel);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id, action, userId, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  if (action === "addMember" && userId) {
    await prisma.channelMember.upsert({
      where: { userId_channelId: { userId, channelId: id } },
      create: { channelId: id, userId },
      update: {},
    });
    return NextResponse.json({ success: true });
  }
  if (action === "removeMember" && userId) {
    await prisma.channelMember.deleteMany({ where: { channelId: id, userId } });
    return NextResponse.json({ success: true });
  }

  await prisma.channel.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await req.json();
  await prisma.channel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
