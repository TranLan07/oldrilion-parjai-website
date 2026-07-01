import { NextRequest, NextResponse } from "next/server";
import { requireHubAdmin, hubDenied } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { generatePublicId } from "@/lib/public-id";

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET() {
  if (!(await requireHubAdmin())) return hubDenied();
  const clans = await prisma.clan.findMany({
    include: {
      tags: { include: { tag: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clans);
}

export async function POST(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  // Unicité du nom (insensible à la casse)
  const existing = await prisma.clan.findFirst({
    where: { name: { equals: name.trim() } },
  });
  if (existing) return NextResponse.json({ error: `Un clan nommé "${existing.name}" existe déjà` }, { status: 409 });

  const slug = toSlug(name.trim());
  const slugExists = await prisma.clan.findUnique({ where: { slug } });
  if (slugExists) return NextResponse.json({ error: `Le slug "${slug}" est déjà utilisé` }, { status: 409 });

  // Créer le clan
  const clan = await prisma.clan.create({
    data: { slug, name: name.trim() },
  });

  // Créer un compte webmaster pour ce clan
  const publicId = await generatePublicId();
  const tempPassword = Math.random().toString(36).slice(2, 10);
  const username = `${slug}-webmaster`;
  const webmaster = await prisma.user.create({
    data: {
      publicId,
      username,
      passwordHash: hashSync(tempPassword, 10),
      displayName: `Webmaster ${clan.name}`,
      hubRole: "member",
      clanId: clan.id,
      role: "admin",
      grade: "",
      specialization: "",
      permissionLevel: 10,
      mustChangePassword: true,
    },
  });

  // Canal général du clan
  await prisma.channel.create({
    data: { clanId: clan.id, name: "général", description: `Canal principal du clan ${clan.name}`, isPrivate: false },
  });

  return NextResponse.json({ clan, webmaster: { username: webmaster.username, tempPassword } });
}

export async function PUT(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  const clan = await prisma.clan.update({ where: { id }, data: {
    ...(data.description !== undefined && { description: data.description }),
    ...(data.colorBg && { colorBg: data.colorBg }),
    ...(data.colorPrimary && { colorPrimary: data.colorPrimary }),
    ...(data.colorAccent && { colorAccent: data.colorAccent }),
  }});
  return NextResponse.json(clan);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id } = await req.json();
  await prisma.clan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
