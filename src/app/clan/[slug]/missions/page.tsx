"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type MissionMember = {
  participating: boolean;
  user: { id: string; displayName: string };
};
type Mission = {
  id: string; title: string; description: string;
  status: string; confidentiality: string; visibility: string;
  maxParticipants: number; createdAt: string;
  members: MissionMember[];
};

const statusMap: Record<string, { label: string; color: string }> = {
  en_cours:   { label: "En cours",   color: "#3b82f6" },
  validee:    { label: "Validee",    color: "#22c55e" },
  abandonnee: { label: "Abandonnee", color: "#eab308" },
  ratee:      { label: "Ratee",      color: "#ef4444" },
};

export default function MissionsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState("all");
  const userId = session?.user?.id;
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const canDha = perm >= 7;
  const [mode, setMode] = useState<"standard" | "dha">("standard");

  const load = useCallback(async () => {
    const res = await fetch(`/api/clan/${slug}/missions?mode=${mode}`);
    if (res.ok) setMissions(await res.json());
  }, [slug, mode]);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function toggleParticipation(missionId: string, current: boolean) {
    await fetch(`/api/clan/${slug}/missions/${missionId}/participate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participating: !current }),
    });
    load();
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "var(--clan-accent, #6b7280)" }}>Connectez-vous pour voir les missions.</div>;

  const filtered = filter === "all" ? missions : missions.filter(m => m.status === filter);
  const isDha = mode === "dha";
  const accentColor = "var(--clan-primary, #c9a84c)";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--clan-accent, #4a4a4a)" }}>
            {isDha ? "Operation Dha" : "Missions"}
          </p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, #f2f2f5)" }}>
            {isDha ? "Classifiees" : "Missions"}
          </h1>
        </div>
        {canDha && (
          <button
            onClick={() => { setMode(isDha ? "standard" : "dha"); setFilter("all"); }}
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
            style={{
              borderColor: isDha ? "#a259e0" : "var(--clan-primary, #c9a84c)",
              color: isDha ? "#a259e0" : "var(--clan-primary, #c9a84c)",
            }}>
            {isDha ? "Mode standard" : "Mode Dha"}
          </button>
        )}
      </div>

      {/* Filtres statut */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "en_cours", "validee", "abandonnee", "ratee"].map(k => {
          const count = k === "all" ? missions.length : missions.filter(m => m.status === k).length;
          const label = k === "all" ? `Toutes (${count})` : `${statusMap[k]?.label} (${count})`;
          const isActive = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)}
              className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
              style={{
                borderColor: isActive ? accentColor : "#2a2a2a",
                color: isActive ? accentColor : "#4a4a4a",
                background: isActive ? `color-mix(in srgb, var(--clan-primary, #c9a84c) 10%, transparent)` : "transparent",
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "#4a4a4a" }}>Aucune mission.</p>
      )}

      <div className="space-y-4">
        {filtered.map(mission => {
          const st = statusMap[mission.status];
          const isParticipating = mission.members.some(m => m.user.id === userId && m.participating);
          const isFull = mission.maxParticipants > 0 && mission.members.length >= mission.maxParticipants && !isParticipating;

          return (
            <div key={mission.id} className="rounded-sm border p-5"
              style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold uppercase tracking-[0.1em]"
                      style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
                      {mission.title}
                    </h3>
                    <span className="rounded-sm px-2 py-0.5 text-xs font-semibold"
                      style={{ background: `${st?.color}20`, color: st?.color, border: `1px solid ${st?.color}40` }}>
                      {st?.label}
                    </span>
                    {mission.visibility === "global" && (
                      <span className="rounded-sm px-2 py-0.5 text-xs" style={{ color: "#6b7280", border: "1px solid #2a2a2a" }}>Hub</span>
                    )}
                    {isDha && mission.confidentiality !== "standard" && (
                      <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em]"
                        style={{ color: mission.confidentiality === "top_secret" ? "#ef4444" : "#a259e0" }}>
                        {mission.confidentiality === "top_secret" ? "Top Secret" : "Secret"}
                      </span>
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
                      borderColor: isParticipating ? "#22c55e" : accentColor,
                      color: isParticipating ? "#22c55e" : accentColor,
                      background: isParticipating ? "rgba(34,197,94,0.08)" : `color-mix(in srgb, var(--clan-primary, #c9a84c) 8%, transparent)`,
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