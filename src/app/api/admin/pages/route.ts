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

  const pages = await prisma.pagePermission.findMany({ orderBy: { path: "asc" } });
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { path, label, minPermission } = await req.json();
  if (!path || !label) return NextResponse.json({ error: "Chemin et label requis" }, { status: 400 });

  const page = await prisma.pagePermission.create({
    data: { path, label, minPermission: minPermission || 1 },
  });

  return NextResponse.json(page);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, path, label, minPermission } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const page = await prisma.pagePermission.update({
    where: { id },
    data: {
      ...(path && { path }),
      ...(label && { label }),
      ...(minPermission !== undefined && { minPermission }),
    },
  });

  return NextResponse.json(page);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.pagePermission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
