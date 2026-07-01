import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const clanSlug = req.nextUrl.searchParams.get("clan");
  const where = clanSlug
    ? { clan: { slug: clanSlug } }
    : {};
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, publicId: true, username: true, displayName: true,
      hubRole: true, role: true, clanId: true,
      clan: { select: { name: true, slug: true } },
      grade: true, specialization: true, permissionLevel: true,
      anonymous: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id, hubRole, banned } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  if (banned) {
    // Ban = supprimer l'utilisateur
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, banned: true });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { ...(hubRole && { hubRole }) },
  });
  return NextResponse.json(user);
}
