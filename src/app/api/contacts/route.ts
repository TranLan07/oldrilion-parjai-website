import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { ownerId: session.user.id },
    include: {
      target: {
        select: {
          id: true, publicId: true, displayName: true, username: true, anonymous: true,
          clan: { select: { name: true, slug: true, colorPrimary: true } },
        },
      },
    },
    orderBy: { target: { displayName: "asc" } },
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { publicId, nickname } = await req.json();
  if (!publicId?.trim()) return NextResponse.json({ error: "PublicId requis" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { publicId: publicId.trim().toUpperCase() } });
  if (!target) return NextResponse.json({ error: "Aucun utilisateur avec cet identifiant" }, { status: 404 });
  if (target.id === session.user.id) return NextResponse.json({ error: "Vous ne pouvez pas vous ajouter vous-même" }, { status: 400 });

  const existing = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: session.user.id, targetId: target.id } },
  });
  if (existing) return NextResponse.json({ error: "Contact déjà dans votre carnet" }, { status: 409 });

  const contact = await prisma.contact.create({
    data: { ownerId: session.user.id, targetId: target.id, nickname: nickname?.trim() || "" },
    include: {
      target: {
        select: {
          id: true, publicId: true, displayName: true, username: true, anonymous: true,
          clan: { select: { name: true, slug: true, colorPrimary: true } },
        },
      },
    },
  });

  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id, nickname } = await req.json();
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.ownerId !== session.user.id) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  await prisma.contact.update({ where: { id }, data: { nickname: nickname?.trim() || "" } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await req.json();
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.ownerId !== session.user.id) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
