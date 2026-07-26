import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: Promise<{ code: string }> };

type Visibility = "public" | "clan" | "private";

// GET /api/user/[code] — profil public, résolu par identifiant public (6 lettres).
// Règles : chaque bloc (discours / bio / infos de clan) a sa propre visibilité
// public | clan (membres du même clan) | private (personne). L'utilisateur lui-même,
// un admin hub, ou l'admin du clan du profil consulté voient toujours tout ("sauf admin").
// Si le clan du profil a désactivé les profils publics (profilesPublic = false), la page
// est inaccessible pour tout le monde sauf ce même groupe d'admins.
export async function GET(_: Request, { params }: P) {
  const { code } = await params;
  const publicId = code.trim().toUpperCase();

  const target = await prisma.user.findUnique({
    where: { publicId },
    select: {
      id: true, publicId: true, displayName: true, anonymous: true, mandalorien: true,
      role: true, grade: true, specialization: true, publicSpecialization: true,
      discours: true, bio: true,
      profileVisDiscours: true, profileVisBio: true, profileVisClanInfo: true, profileShowRealSpec: true,
      clanId: true,
      specializationRef: { select: { secret: true, color: true } },
      clan: { select: { id: true, slug: true, name: true, colorBg: true, colorPrimary: true, colorAccent: true, profilesPublic: true } },
    },
  });
  if (!target) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const session = await auth();
  const s = session as unknown as { user?: { id?: string }; hubRole?: string } | null;
  const viewerId = s?.user?.id;
  const isHubAdmin = s?.hubRole === "admin";
  const isSelf = viewerId === target.id;

  let viewerClanId: string | null = null;
  let isClanAdmin = false;
  if (viewerId && !isSelf) {
    const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { clanId: true, permissionLevel: true } });
    if (viewer) {
      viewerClanId = viewer.clanId;
      if (target.clanId && viewer.clanId === target.clanId && viewer.permissionLevel >= 10) isClanAdmin = true;
    }
  }
  const bypass = isSelf || isHubAdmin || isClanAdmin;

  if (!bypass && target.clan && !target.clan.profilesPublic) {
    return NextResponse.json({ accessible: false, reason: "clan_private" });
  }

  const sameClan = Boolean(viewerId && target.clanId && viewerClanId === target.clanId);
  function visible(vis: string): boolean {
    if (bypass) return true;
    const v = vis as Visibility;
    if (v === "public") return true;
    if (v === "clan") return sameClan;
    return false;
  }

  const displayName = target.anonymous && !bypass ? target.publicId : target.displayName;

  let clanInfo = null;
  if (target.clan && visible(target.profileVisClanInfo)) {
    const secret = target.specializationRef?.secret ?? false;
    const specialization = secret && !bypass && !target.profileShowRealSpec
      ? (target.publicSpecialization || "Spécialité classifiée")
      : (target.specialization || "—");
    clanInfo = {
      clan: { slug: target.clan.slug, name: target.clan.name, colorBg: target.clan.colorBg, colorPrimary: target.clan.colorPrimary, colorAccent: target.clan.colorAccent },
      grade: target.grade,
      role: target.role,
      specialization,
      specializationSecret: secret,
    };
  }

  return NextResponse.json({
    accessible: true,
    isOwner: isSelf,
    publicId: target.publicId,
    displayName,
    mandalorien: target.mandalorien,
    discours: visible(target.profileVisDiscours) ? target.discours : null,
    bio: visible(target.profileVisBio) ? target.bio : null,
    clanInfo,
  });
}
