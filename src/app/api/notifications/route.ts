import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(notifications);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id, readAll } = await req.json();

  if (readAll) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  } else if (id) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (notif?.userId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });
    await prisma.notification.update({ where: { id }, data: { read: true } });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id, deleteAll } = await req.json();

  if (deleteAll) {
    await prisma.notification.deleteMany({ where: { userId: session.user.id } });
  } else if (id) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (notif?.userId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });
    await prisma.notification.delete({ where: { id } });
  }
  return NextResponse.json({ success: true });
}