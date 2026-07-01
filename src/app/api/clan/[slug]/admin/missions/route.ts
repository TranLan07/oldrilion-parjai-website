import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, resolveClan, denied, notFound } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const missions = await prisma.mission.findMany({
    where: { clanId: clan.id },
    include: { members: { include: { user: { select: { id: true, displayName: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(missions);
}

export async function POST(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  const { title, description, confidentiality, maxParticipants, memberIds, visibility } = await req.json();
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const mission = await prisma.mission.create({
    data: {
      clanId: clan.id, title, description: description || "",
      confidentiality: confidentiality || "standard",
      maxParticipants: maxParticipants || 0,
      visibility: visibility === "global" ? "global" : "internal",
      members: memberIds?.length ? { create: memberIds.map((userId: string) => ({ userId })) } : undefined,
    },
  });
  return NextResponse.json(mission);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id, action, userId, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  if (action === "addMember" && userId) {
    await prisma.missionMember.create({ data: { missionId: id, userId } });
    return NextResponse.json({ success: true });
  }
  if (action === "removeMember" && userId) {
    await prisma.missionMember.deleteMany({ where: { missionId: id, userId } });
    return NextResponse.json({ success: true });
  }

  const mission = await prisma.mission.update({ where: { id }, data: {
    ...(data.title && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.status && { status: data.status }),
    ...(data.confidentiality && { confidentiality: data.confidentiality }),
    ...(data.maxParticipants !== undefined && { maxParticipants: data.maxParticipants }),
    ...(data.visibility !== undefined && { visibility: data.visibility }),
  }});
  return NextResponse.json(mission);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { slug } = await params;
  if (!(await requireClanAdmin(slug))) return denied();
  const { id } = await req.json();
  await prisma.mission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
