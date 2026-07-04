import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscribe } from "@/lib/sse-store";
import { resolveClan } from "@/lib/clan-auth";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non authentifie", { status: 401 });

  const { slug, id } = await params;

  const clan = await resolveClan(slug);
  if (!clan) return new Response("Clan introuvable", { status: 404 });
  if (clan.suspended) return new Response("Ce clan est suspendu", { status: 403 });

  const channel = await prisma.channel.findUnique({ where: { id }, include: { members: true } });
  if (!channel || channel.clanId !== clan.id) return new Response("Canal introuvable", { status: 404 });

  const isMember = channel.members.some(m => m.userId === session.user!.id);
  if (channel.isPrivate && !isMember) return new Response("Acces refuse", { status: 403 });

  const userRecord = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mandalorien: true } });
  const isMandalorien = userRecord?.mandalorien ?? false;

  // Masque la traduction Mando'a pour les abonnés non-mandaloriens
  function sanitize(data: string): string {
    if (isMandalorien) return data;
    try {
      const payload = JSON.parse(data);
      if (payload?.type === "message" && payload.message?.mandoa && payload.message.originalContent) {
        payload.message.originalContent = null;
        return JSON.stringify(payload);
      }
    } catch { /* payload non-JSON : transmis tel quel */ }
    return data;
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try { controller.enqueue(encoder.encode(": ping\n\n")); }
        catch { clearInterval(heartbeat); closed = true; }
      }, 25000);

      unsubscribe = subscribe(id, (data: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${sanitize(data)}\n\n`)); }
        catch { closed = true; }
      });

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // suppress unused variable warning
      void heartbeat;
    },
    cancel() {
      closed = true;
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}