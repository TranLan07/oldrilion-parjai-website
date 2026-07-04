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

  const existing = await prisma.clan.findFirst({ where: { name: { equals: name.trim() } } });
  if (existing) return NextResponse.json({ error: `Un clan nommé "${existing.name}" existe déjà` }, { status: 409 });

  const slug = toSlug(name.trim());
  const slugExists = await prisma.clan.findUnique({ where: { slug } });
  if (slugExists) return NextResponse.json({ error: `Le slug "${slug}" est déjà utilisé` }, { status: 409 });

  const clan = await prisma.clan.create({ data: { slug, name: name.trim() } });

  const publicId = await generatePublicId();
  const tempPassword = Math.random().toString(36).slice(2, 10);
  const username = `${slug}-webmaster`;
  const webmaster = await prisma.user.create({
    data: {
      publicId, username,
      passwordHash: hashSync(tempPassword, 10),
      displayName: `Webmaster ${clan.name}`,
      hubRole: "member",
      clanId: clan.id,
      role: "admin",
      grade: "",
      specialization: "",
      permissionLevel: 10,
      mustChangePassword: true,
      mandalorien: true,
    },
  });

  await prisma.channel.create({
    data: { clanId: clan.id, name: "général", description: `Canal principal du clan ${clan.name}`, isPrivate: false },
  });

  return NextResponse.json({ clan, webmaster: { username: webmaster.username, tempPassword } });
}

export async function PUT(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.colorBg) updateData.colorBg = data.colorBg;
  if (data.colorPrimary) updateData.colorPrimary = data.colorPrimary;
  if (data.colorAccent) updateData.colorAccent = data.colorAccent;
  // Freemium
  if (data.premium !== undefined) {
    updateData.premium = data.premium;
    updateData.premiumSince = data.premium ? new Date() : null;
  }
  // Suspension
  if (data.suspended !== undefined) {
    updateData.suspended = data.suspended;
    updateData.suspendedReason = data.suspended ? (data.suspendedReason ?? null) : null;
    updateData.suspendedAt = data.suspended ? new Date() : null;
  }

  const clan = await prisma.clan.update({ where: { id }, data: updateData });
  return NextResponse.json(clan);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireHubAdmin())) return hubDenied();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Récupérer les membres pour les notifier
    const members = await tx.user.findMany({ where: { clanId: id }, select: { id: true } });

    // Reset tous les membres vers "sans-clan"
    await tx.user.updateMany({
      where: { clanId: id },
      data: {
        clanId: null, gradeId: null, specializationId: null,
        role: "membre", grade: "Recrue", specialization: "", publicSpecialization: "",
        permissionLevel: 1, mandalorien: false,
      },
    });

    // Notifier chaque ex-membre
    if (members.length > 0) {
      await tx.notification.createMany({
        data: members.map(m => ({
          userId: m.id,
          type: "clan_dissolved",
          title: "Clan dissous",
          body: "Votre clan a été dissous par les administrateurs du Hub. Vous êtes maintenant sans-clan.",
        })),
      });
    }

    // Annonces marketplace du clan : suppression explicite
    // (relation optionnelle → la suppression du clan les transformerait en annonces "joueur" sans expiration)
    await tx.marketplaceListing.deleteMany({ where: { clanId: id } });

    // Supprimer le clan (cascade : grades, specs, canaux, missions, etc.)
    await tx.clan.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
