"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type EventMember = { user: { id: string; displayName: string } };
type ClanEvent = {
  id: string; title: string; description: string;
  status: string; visibility: string;
  maxParticipants: number | null; startAt: string | null; createdAt: string;
  specialization: { id: string; name: string } | null;
  members: EventMember[];
  _count: { members: number };
};

const statusMap: Record<string, { label: string; color: string }> = {
  a_venir:  { label: "A venir",  color: "#3b82f6" },
  en_cours: { label: "En cours", color: "#22c55e" },
  termine:  { label: "Termine",  color: "#6b7280" },
};

export default function EvenementsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [filter, setFilter] = useState("all");
  const userId = session?.user?.id;

  const load = useCallback(async () => {
    const res = await fetch(`/api/clan/${slug}/evenements`);
    if (res.ok) setEvents(await res.json());
  }, [slug]);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function toggleJoin(eventId: string, isJoined: boolean) {
    await fetch(`/api/clan/${slug}/evenements/${eventId}/join`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join: !isJoined }),
    });
    load();
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "var(--clan-accent, #6b7280)" }}>Connectez-vous pour voir les evenements.</div>;

  const filtered = filter === "all" ? events : events.filter(e => e.status === filter);
  const accentColor = "var(--clan-primary, #c9a84c)";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--clan-accent, #4a4a4a)" }}>Clan</p>
        <h1 className="text-4xl font-bold uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, #f2f2f5)" }}>Evenements</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "a_venir", "en_cours", "termine"].map(k => {
          const count = k === "all" ? events.length : events.filter(e => e.status === k).length;
          const label = k === "all" ? `Tous (${count})` : `${statusMap[k]?.label} (${count})`;
          const isActive = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)}
              className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
              style={{ borderColor: isActive ? accentColor : "#2a2a2a", color: isActive ? accentColor : "#4a4a4a" }}>
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="py-16 text-center text-sm" style={{ color: "#4a4a4a" }}>Aucun evenement.</p>}

      <div className="space-y-4">
        {filtered.map(ev => {
          const st = statusMap[ev.status];
          const isJoined = ev.members.some(m => m.user.id === userId);
          const isFull = ev.maxParticipants != null && ev._count.members >= ev.maxParticipants && !isJoined;

          return (
            <div key={ev.id} className="rounded-sm border p-5" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold uppercase tracking-[0.1em]"
                      style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>{ev.title}</h3>
                    <span className="rounded-sm px-2 py-0.5 text-xs font-semibold"
                      style={{ background: `${st?.color}20`, color: st?.color, border: `1px solid ${st?.color}40` }}>
                      {st?.label}
                    </span>
                    {ev.visibility === "global" && (
                      <span className="rounded-sm px-2 py-0.5 text-xs" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Hub</span>
                    )}
                    {ev.visibility === "private" && (
                      <span className="rounded-sm px-2 py-0.5 text-xs" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Prive</span>
                    )}
                    {ev.specialization && (
                      <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: accentColor, border: `1px solid ${accentColor}40` }}>
                        {ev.specialization.name}
                      </span>
                    )}
                  </div>
                  {ev.description && <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{ev.description}</p>}
                  <div className="mt-2 flex gap-4 text-xs" style={{ color: "#3a3a3a" }}>
                    {ev.startAt && <span>Debut: {new Date(ev.startAt).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>}
                    <span>{ev._count.members}{ev.maxParticipants != null ? `/${ev.maxParticipants}` : ""} participants</span>
                  </div>
                </div>

                {ev.status !== "termine" && (
                  <button
                    onClick={() => !isFull && toggleJoin(ev.id, isJoined)}
                    disabled={isFull}
                    className="shrink-0 rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: isJoined ? "#22c55e" : accentColor,
                      color: isJoined ? "#22c55e" : accentColor,
                    }}>
                    {isFull ? "Complet" : isJoined ? "Inscrit" : "Rejoindre"}
                  </button>
                )}
              </div>

              {ev.members.length > 0 && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "#1a1a1a" }}>
                  <p className="mb-1.5 text-xs uppercase tracking-[0.15em]" style={{ color: "#3a3a3a" }}>Participants</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.members.map(m => (
                      <span key={m.user.id} className="rounded-sm px-2 py-0.5 text-xs"
                        style={{ background: "#161616", color: "#9ca3af", border: "1px solid #222" }}>
                        {m.user.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}