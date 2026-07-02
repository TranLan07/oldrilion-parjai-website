import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveClan, notFound , suspendedResponse } from "@/lib/clan-auth";

type P = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: P) {
  const { slug } = await params;
  const clan = await resolveClan(slug);
  if (!clan) return notFound();
  if (clan.suspended) return suspendedResponse();

  const users = await prisma.user.findMany({
    where: { clanId: clan.id },
    select: { id: true, displayName: true, grade: true, specialization: true, publicSpecialization: true, anonymous: true, publicId: true },
    orderBy: { createdAt: "asc" },
  });

  const members = users.map(u => {
    const isDha = u.specialization.toLowerCase() === "dha";
    return {
      id: u.id,
      publicId: u.publicId,
      displayName: u.anonymous ? u.publicId : u.displayName,
      grade: u.grade,
      specialization: isDha ? (u.publicSpecialization || "Kyramud") : (u.specialization || "—"),
      anonymous: u.anonymous,
    };
  });

  return NextResponse.json(members);
}
