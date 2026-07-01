"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

type Mission = {
  id: string; title: string; description: string;
  status: string; visibility: string; maxParticipants: number; createdAt: string;
  clan: { name: string; slug: string; colorPrimary: string } | null;
  members: { participating: boolean; user: { id: string; displayName: string } }[];
};

const statusMap: Record<string, { label: string; color: string }> = {
  en_cours:   { label: "En cours",    color: "#3b82f6" },
  validee:    { label: "Validée",     color: "#22c55e" },
  abandonnee: { label: "Abandonnée",  color: "#eab308" },
  ratee:      { label: "Ratée",       color: "#ef4444" },
};

export default function HubMissionsPage() {
  const { data: session } = useSession();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState("all");
  const [clanFilter, setClanFilter] = useState("all");
  const userId = session?.user?.id;

  const load = useCallback(async () => {
    const r = await fetch("/api/hub/missions");
    if (r.ok) setMissions(await r.json());
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function toggleParticipation(missionId: string, current: boolean) {
    await fetch(`/api/hub/missions/${missionId}/participate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participating: !current }),
    });
    load();
  }

  if (!session) return (
    <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour voir les missions.</div>
  );

  // Clans uniques présents dans les missions pour le filtre
  const clansPresents = Array.from(
    new Map(missions.filter(m => m.clan).map(m => [m.clan!.slug, m.clan!])).values()
  );

  const filtered = missions.filter(m => {
    if (filter !== "all" && m.status !== filter) return false;
    if (clanFilter === "hub" && m.clan !== null) return false;
    if (clanFilter !== "all" && clanFilter !== "hub" && m.clan?.slug !== clanFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Inter-clans</p>
        <h1 className="text-4xl font-bold uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Missions Hub</h1>
        <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>
          Missions globales ouvertes à tous les membres du réseau mandalorien.
        </p>
      </div>

      {/* Filtres statut */}
      <div className="mb-3 flex flex-wrap gap-2">
        {["all", "en_cours", "validee", "abandonnee", "ratee"].map(k => {
          const count = k === "all" ? missions.length : missions.filter(m => m.status === k).length;
          const label = k === "all" ? `Toutes (${count})` : `${statusMap[k]?.label} (${count})`;
          const isActive = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)}
              className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]"
              style={{
                borderColor: isActive ? "#c9a84c" : "#2a2a2a",
                color: isActive ? "#c9a84c" : "#4a4a4a",
                background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Filtres clan */}
      {clansPresents.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setClanFilter("all")}
            className="rounded-sm border px-3 py-1.5 text-xs"
            style={{ borderColor: clanFilter === "all" ? "#f2f2f5" : "#1a1a1a", color: clanFilter === "all" ? "#f2f2f5" : "#4a4a4a" }}>
            Tous les clans
          </button>
          <button onClick={() => setClanFilter("hub")}
            className="rounded-sm border px-3 py-1.5 text-xs"
            style={{ borderColor: clanFilter === "hub" ? "#c9a84c" : "#1a1a1a", color: clanFilter === "hub" ? "#c9a84c" : "#4a4a4a" }}>
            Hub uniquement
          </button>
          {clansPresents.map(clan => (
            <button key={clan.slug} onClick={() => setClanFilter(clan.slug)}
              className="rounded-sm border px-3 py-1.5 text-xs"
              style={{
                borderColor: clanFilter === clan.slug ? clan.colorPrimary : "#1a1a1a",
                color: clanFilter === clan.slug ? clan.colorPrimary : "#4a4a4a",
              }}>
              {clan.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "#4a4a4a" }}>Aucune mission.</p>
      )}

      <div className="space-y-4">
        {filtered.map(mission => {
          const st = statusMap[mission.status];
          const isParticipating = mission.members.some(m => m.user.id === userId && m.participating);
          const isFull = mission.maxParticipants > 0 && mission.members.length >= mission.maxParticipants && !isParticipating;
          const clanColor = mission.clan?.colorPrimary ?? "#c9a84c";

          return (
            <div key={mission.id} className="rounded-sm border p-5" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              {/* Bande couleur clan */}
              <div className="mb-4 -mx-5 -mt-5 h-0.5" style={{ background: `linear-gradient(90deg, ${clanColor}80, transparent)` }} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
                      {mission.title}
                    </h3>
                    <span className="rounded-sm px-2 py-0.5 text-xs font-semibold"
                      style={{ background: `${st?.color}20`, color: st?.color, border: `1px solid ${st?.color}40` }}>
                      {st?.label}
                    </span>
                    {mission.clan ? (
                      <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]"
                        style={{ color: clanColor, border: `1px solid ${clanColor}40`, background: `${clanColor}10` }}>
                        {mission.clan.name}
                      </span>
                    ) : (
                      <span className="rounded-sm px-2 py-0.5 text-xs" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Hub</span>
                    )}
                  </div>
                  {mission.description && (
                    <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{mission.description}</p>
                  )}
                  <p className="mt-2 text-xs" style={{ color: "#3a3a3a" }}>
                    {new Date(mission.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>

                {mission.status === "en_cours" && (
                  <button
                    onClick={() => !isFull && toggleParticipation(mission.id, isParticipating)}
                    disabled={isFull}
                    className="shrink-0 rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: isParticipating ? "#22c55e" : "#c9a84c",
                      color: isParticipating ? "#22c55e" : "#c9a84c",
                      background: isParticipating ? "rgba(34,197,94,0.08)" : "rgba(201,168,76,0.08)",
                    }}>
                    {isFull ? "Complet" : isParticipating ? "Participant" : "Participer"}
                  </button>
                )}
              </div>

              {mission.members.length > 0 && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "#1a1a1a" }}>
                  <p className="mb-1.5 text-xs uppercase tracking-[0.15em]" style={{ color: "#3a3a3a" }}>
                    Participants ({mission.members.length}{mission.maxParticipants > 0 ? `/${mission.maxParticipants}` : ""})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mission.members.map(m => (
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
