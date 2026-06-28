import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new NextResponse("Token manquant", { status: 400 });

  const follower = await prisma.channelFollower.findUnique({ where: { confirmToken: token } });
  if (!follower) return new NextResponse("Token invalide ou expiré", { status: 404 });

  await prisma.channelFollower.update({
    where: { id: follower.id },
    data: { confirmed: true },
  });

  const channel = await prisma.channel.findUnique({ where: { id: follower.channelId } });

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confirmation</title></head>
    <body style="background:#0a0a0f;color:#e8e6e3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
    <div style="text-align:center;padding:32px;">
      <h1 style="color:#c9a84c;">Suivi confirmé !</h1>
      <p>Vous recevrez les messages du canal <strong>#${channel?.name || "inconnu"}</strong> par email.</p>
      <a href="/" style="color:#c9a84c;">Retour au site</a>
    </div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
