import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({
    where: { slug },
    select: {
      id: true, name: true, description: true,
      colorBg: true, colorPrimary: true, colorAccent: true,
      pagePerms: { where: { path: "diplomatie" }, select: { minPermission: true } },
    },
  });
  if (!clan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const diploPerms = clan.pagePerms[0];
  const diplomacyPublic = !diploPerms || diploPerms.minPermission <= 1;

  return NextResponse.json({
    name: clan.name, description: clan.description,
    colorBg: clan.colorBg, colorPrimary: clan.colorPrimary, colorAccent: clan.colorAccent,
    diplomacyPublic,
  });
}
