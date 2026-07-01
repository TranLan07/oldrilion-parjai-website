import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscribe } from "@/lib/sse-store";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non authentifié", { status: 401 });

  const { id } = await params;
  const channel = await prisma.channel.findUnique({ where: { id, clanId: null } });
  if (!channel) return new Response("Canal introuvable", { status: 404 });

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
        try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); }
        catch { closed = true; }
      });

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
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
