import { NextRequest, NextResponse } from "next/server";
import { requireClanAdmin, denied, resolveClan, notFound, suspendedResponse } from "@/lib/clan-auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string; id: string }> };

export async function PUT(req: NextRequest, { params }: P) {
  const { slug, id } = await params;
  if (!(await requireClanAdmin(slug))) return denied();

  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const existing = await prisma.channel.findUnique({ where: { id }, select: { clanId: true } });
  if (!existing || existing.clanId !== clan.id) return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });

  const data = await req.json();
  const channel = await prisma.channel.update({
    where: { id },
    data: {
      ...(data.emailNotifEnabled !== undefined && { emailNotifEnabled: data.emailNotifEnabled }),
      ...(data.emailNotifDelayMin !== undefined && { emailNotifDelayMin: data.emailNotifDelayMin }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
  return NextResponse.json(channel);
}
