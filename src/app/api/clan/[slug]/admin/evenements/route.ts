import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClanAdmin, denied, notFound, resolveClan } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const events = await prisma.event.findMany({
    where: { clanId: clan.id },
    include: {
      specialization: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();

  const { title, description, status, visibility, specializationId, maxParticipants, startAt } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const event = await prisma.event.create({
    data: {
      clanId: clan.id, title: title.trim(),
      description: description?.trim() || "",
      status: status || "a_venir",
      visibility: visibility || "internal",
      specializationId: specializationId || null,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      startAt: startAt ? new Date(startAt) : null,
    },
  });
  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();

  const { id, ...data } = await req.json();
  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.visibility && { visibility: data.visibility }),
      ...(data.specializationId !== undefined && { specializationId: data.specializationId || null }),
      ...(data.maxParticipants !== undefined && { maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : null }),
      ...(data.startAt !== undefined && { startAt: data.startAt ? new Date(data.startAt) : null }),
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();

  const { id } = await req.json();
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}