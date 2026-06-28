import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const perm = (session as unknown as Record<string, unknown>)?.permissionLevel as number;
  if (!session?.user || perm < 10) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const missions = await prisma.mission.findMany({
    include: {
      members: { include: { user: { select: { id: true, displayName: true, role: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(missions);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { title, description, confidentiality, memberIds } = await req.json();
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const mission = await prisma.mission.create({
    data: {
      title,
      description: description || "",
      confidentiality: confidentiality || "standard",
      members: memberIds?.length
        ? { create: memberIds.map((userId: string) => ({ userId })) }
        : undefined,
    },
  });

  return NextResponse.json(mission);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

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

  const mission = await prisma.mission.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.confidentiality && { confidentiality: data.confidentiality }),
    },
  });

  return NextResponse.json(mission);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.mission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
