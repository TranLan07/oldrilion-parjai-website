import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  if (perm < 10) return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { id } = await params;
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
    await prisma.channelMember.updateMany({
      where: { userId, channelId: id },
      data: { muted: true },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "unmute" && userId) {
    await prisma.channelMember.updateMany({
      where: { userId, channelId: id },
      data: { muted: false },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
