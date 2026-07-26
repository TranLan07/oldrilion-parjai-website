import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";

// GET : toutes les demandes envoyées par les admins de clan.
export async function GET() {
  if (!(await requireHubAdmin())) return hubDenied();
  const requests = await prisma.clanAdminRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      clan: { select: { name: true, slug: true, colorPrimary: true } },
      author: { select: { displayName: true, username: true } },
    },
  });
  return NextResponse.json(requests);
}

// PUT : changer le statut (répondue / fermée).
export async function PUT(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id, status } = await req.json();
  if (!id || !["pending", "answered", "closed"].includes(status)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const updated = await prisma.clanAdminRequest.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}

// DELETE : supprimer une demande traitée.
export async function DELETE(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id } = await req.json();
  await prisma.clanAdminRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
