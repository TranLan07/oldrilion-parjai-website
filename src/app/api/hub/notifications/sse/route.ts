import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non authentifié", { status: 401 });

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      const ping = setInterval(() => {
        try { controller.enqueue(enc.encode(": ping\n\n")); }
        catch { clearInterval(ping); }
      }, 25000);

      // Import dynamique pour éviter le cycle au top level
      import("@/lib/sse-store").then(({ subscribeNotif, publishNotifCount }) => {
        // Envoyer le ping initial + s'abonner
        publishNotifCount(userId);

        const unsub = subscribeNotif(userId, (count: number) => {
          try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ count })}\n\n`));
          } catch { unsub(); clearInterval(ping); }
        });

        // Cleanup sur fermeture
        const cleanup = () => { unsub(); clearInterval(ping); try { controller.close(); } catch {} };
        (controller as unknown as { signal?: AbortSignal }).signal?.addEventListener("abort", cleanup);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
