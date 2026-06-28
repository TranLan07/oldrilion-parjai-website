import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      displayName: true,
      grade: true,
      specialization: true,
      publicSpecialization: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const members = users.map((u) => {
    const isDha = u.specialization.toLowerCase() === "dha";
    return {
      id: u.id,
      displayName: u.displayName,
      grade: u.grade,
      specialization: isDha
        ? (u.publicSpecialization || "Kyramud")
        : (u.specialization || "—"),
    };
  });

  return NextResponse.json(members);
}
