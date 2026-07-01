"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

type Event = {
  id: string; title: string; description: string; status: string;
  maxParticipants: number | null; startAt: string | null; createdAt: string;
  clan: { name: string; slug: string; colorPrimary: string } | null;
  specialization: { name: string } | null;
  members: { user: { id: string; displayName: string } }[];
};

const statusMap: Record<string, { label: string; color: string }> = {
  a_venir:  { label: "À venir",  color: "#c9a84c" },
  en_cours: { label: "En cours", color: "#3b82f6" },
  termine:  { label: "Terminé",  color: "#6b7280" },
};

export default function HubEvenementsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState("all");
  const userId = session?.user?.id;

  const load = useCallback(async () => {
    const r = await fetch("/api/hub/events");
    if (r.ok) setEvents(await r.json());
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function toggleJoin(eventId: string, joined: boolean) {
    await fetch(`/api/hub/events/${eventId}/join`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join: !joined }),
    });
    load();
  }

  if (!session) return (
    <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour voir les événements.</div>
  );

  const clansPresents = Array.from(
    new Map(events.filter(e => e.clan).map(e => [e.clan!.slug, e.clan!])).values()
  );

  const filtered = events.filter(e => {
    if (filter !== "all" && filter !== "hub" && e.clan?.slug !== filter) return false;
    if (filter === "hub" && e.clan !== null) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Inter-clans</p>
        <h1 className="text-4xl font-bold uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Événements Hub</h1>
        <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>
          Événements ouverts à tous les membres du réseau, approuvés par les administrateurs du Hub.
        </p>
      </div>

      {clansPresents.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setFilter("all")}
            className="rounded-sm border px-3 py-1.5 text-xs transition-all"
            style={{ borderColor: filter === "all" ? "#f2f2f5" : "#1a1a1a", color: filter === "all" ? "#f2f2f5" : "#4a4a4a" }}>
            Tous
          </button>
          <button onClick={() => setFilter("hub")}
            className="rounded-sm border px-3 py-1.5 text-xs transition-all"
            style={{ borderColor: filter === "hub" ? "#c9a84c" : "#1a1a1a", color: filter === "hub" ? "#c9a84c" : "#4a4a4a" }}>
            Hub uniquement
          </button>
          {clansPresents.map(clan => (
            <button key={clan.slug} onClick={() => setFilter(clan.slug)}
              className="rounded-sm border px-3 py-1.5 text-xs transition-all"
              style={{ borderColor: filter === clan.slug ? clan.colorPrimary : "#1a1a1a", color: filter === clan.slug ? clan.colorPrimary : "#4a4a4a" }}>
              {clan.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "#4a4a4a" }}>Aucun événement disponible.</p>
      )}

      <div className="space-y-4">
        {filtered.map(event => {
          const st = statusMap[event.status] ?? { label: event.status, color: "#6b7280" };
          const joined = event.members.some(m => m.user.id === userId);
          const isFull = event.maxParticipants != null && event.members.length >= event.maxParticipants && !joined;
          const clanColor = event.clan?.colorPrimary ?? "#c9a84c";

          return (
            <div key={event.id} className="rounded-sm border p-5" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              <div className="mb-4 -mx-5 -mt-5 h-0.5" style={{ background: `linear-gradient(90deg, ${clanColor}80, transparent)` }} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
                      {event.title}
                    </h3>
                    <span className="rounded-sm px-2 py-0.5 text-xs font-semibold"
                      style={{ background: `${st.color}20`, color: st.color, border: `1px solid ${st.color}40` }}>
                      {st.label}
                    </span>
                    {event.clan ? (
                      <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]"
                        style={{ color: clanColor, border: `1px solid ${clanColor}40`, background: `${clanColor}10` }}>
                        {event.clan.name}
                      </span>
                    ) : (
                      <span className="rounded-sm px-2 py-0.5 text-xs" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Hub</span>
                    )}
                    {event.specialization && (
                      <span className="rounded-sm px-2 py-0.5 text-xs" style={{ color: "#6b7280", border: "1px solid #1a1a1a" }}>
                        {event.specialization.name}
                      </span>
                    )}
                  </div>
                  {event.description && <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{event.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: "#3a3a3a" }}>
                    {event.startAt && (
                      <span>
                        {new Date(event.startAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span>{event.members.length}{event.maxParticipants ? `/${event.maxParticipants}` : ""} participants</span>
                  </div>
                </div>

                {event.status !== "termine" && (
                  <button
                    onClick={() => !isFull && toggleJoin(event.id, joined)}
                    disabled={isFull}
                    className="shrink-0 rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: joined ? "#22c55e" : "#c9a84c",
                      color: joined ? "#22c55e" : "#c9a84c",
                      background: joined ? "rgba(34,197,94,0.08)" : "rgba(201,168,76,0.08)",
                    }}
                    onMouseEnter={e => { if (!isFull) e.currentTarget.style.background = joined ? "rgba(34,197,94,0.15)" : "rgba(201,168,76,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = joined ? "rgba(34,197,94,0.08)" : "rgba(201,168,76,0.08)"; }}>
                    {isFull ? "Complet" : joined ? "Inscrit ✓" : "S'inscrire"}
                  </button>
                )}
              </div>

              {event.members.length > 0 && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "#1a1a1a" }}>
                  <div className="flex flex-wrap gap-1.5">
                    {event.members.map(m => (
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
