"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

type MissionMember = {
  participating: boolean;
  user: { id: string; displayName: string; role: string };
};

type Mission = {
  id: string;
  title: string;
  description: string;
  status: string;
  confidentiality: string;
  maxParticipants: number;
  createdAt: string;
  members: MissionMember[];
};

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  en_cours: { label: "En cours", color: "border-blue-700/40 bg-blue-900/20 text-blue-400", icon: "⏳" },
  validee: { label: "Validée", color: "border-green-700/40 bg-green-900/20 text-green-400", icon: "✓" },
  abandonnee: { label: "Abandonnée", color: "border-yellow-700/40 bg-yellow-900/20 text-yellow-400", icon: "⏸" },
  ratee: { label: "Ratée", color: "border-red-700/40 bg-red-900/20 text-red-400", icon: "✗" },
};

const confLabels: Record<string, string> = {
  standard: "Standard",
  secret: "Secret",
  top_secret: "Top Secret",
};

export default function MissionsPage() {
  const { data: session } = useSession();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [mode, setMode] = useState<"standard" | "dha">("standard");
  const userId = session?.user?.id;
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const canDha = perm >= 7;

  const load = useCallback(async () => {
    const res = await fetch(`/api/missions?mode=${mode}`);
    if (res.ok) setMissions(await res.json());
  }, [mode]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  async function toggleParticipation(missionId: string, current: boolean) {
    await fetch(`/api/missions/${missionId}/participate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participating: !current }),
    });
    load();
  }

  if (!session) {
    return <div className="p-12 text-center text-foreground/50">Connectez-vous pour accéder aux missions.</div>;
  }

  const isDha = mode === "dha";
  const filtered = filter === "all" ? missions : missions.filter((m) => m.status === filter);

  const accentColor = isDha ? "purple" : "accent";

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className={`mb-8 rounded-lg border p-6 ${
        isDha
          ? "border-purple-800/30 bg-gradient-to-r from-purple-950/40 to-background"
          : "border-accent-dim/20 bg-gradient-to-r from-surface to-background"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold tracking-widest ${isDha ? "text-purple-400" : "text-accent"}`}>
              {isDha ? "MISSIONS DHA" : "MISSIONS"}
            </h1>
            <p className={`mt-1 ${isDha ? "text-purple-300/50" : "text-foreground/50"}`}>
              {isDha ? "Opérations classifiées — Espace Dha" : "Opérations du clan Parjai"}
            </p>
          </div>

          {/* Switch Dha */}
          {canDha && (
            <button
              onClick={() => { setMode(isDha ? "standard" : "dha"); setFilter("all"); }}
              className={`flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-medium uppercase tracking-wider transition-all ${
                isDha
                  ? "border-purple-600 bg-purple-900/40 text-purple-300 hover:bg-purple-900/60"
                  : "border-accent-dim/30 bg-surface text-foreground/60 hover:border-purple-600 hover:text-purple-400"
              }`}
            >
              {/* Toggle visual */}
              <div className={`relative h-5 w-9 rounded-full transition-colors ${isDha ? "bg-purple-600" : "bg-foreground/20"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isDha ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span>Mode Dha</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
            filter === "all"
              ? isDha ? "bg-purple-800/40 text-purple-300" : "bg-accent/20 text-accent"
              : "bg-surface text-foreground/50 hover:text-foreground"
          }`}
        >Toutes ({missions.length})</button>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = missions.filter((m) => m.status === key).length;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                filter === key
                  ? isDha ? "bg-purple-800/40 text-purple-300" : "bg-accent/20 text-accent"
                  : "bg-surface text-foreground/50 hover:text-foreground"
              }`}
            >{cfg.icon} {cfg.label} ({count})</button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg text-foreground/40">
              {isDha ? "Aucune mission classifiée." : "Aucune mission en cours."}
            </p>
          </div>
        )}

        {filtered.map((mission) => {
          const st = statusConfig[mission.status] || statusConfig.en_cours;
          const isParticipating = mission.members.some((m) => m.user.id === userId && m.participating);

          return (
            <div
              key={mission.id}
              className={`rounded-lg border bg-surface p-5 transition-colors ${
                isDha
                  ? mission.confidentiality === "top_secret"
                    ? "border-red-800/30 hover:border-red-700/40"
                    : "border-purple-800/30 hover:border-purple-700/40"
                  : "border-accent-dim/20 hover:border-accent-dim/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{mission.title}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                    {isDha && (
                      <span className={`text-xs font-medium uppercase tracking-wider ${
                        mission.confidentiality === "top_secret" ? "text-red-400" : "text-purple-400"
                      }`}>
                        {confLabels[mission.confidentiality] || mission.confidentiality}
                      </span>
                    )}
                  </div>
                  {mission.description && (
                    <p className="mt-2 text-sm text-foreground/60">{mission.description}</p>
                  )}
                  <p className="mt-2 text-xs text-foreground/30">
                    {new Date(mission.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>

                {mission.status === "en_cours" && (() => {
                  const isFull = mission.maxParticipants > 0 && mission.members.length >= mission.maxParticipants && !isParticipating;
                  return (
                  <button
                    onClick={() => !isFull && toggleParticipation(mission.id, isParticipating)}
                    disabled={isFull}
                    className={`shrink-0 rounded px-4 py-2 text-sm font-medium uppercase tracking-wider transition-all ${
                      isFull ? "border border-foreground/20 text-foreground/30 cursor-not-allowed"
                      : isParticipating
                        ? `border ${isDha ? "border-green-700 bg-green-900/30 text-green-400" : "border-green-700 bg-green-900/30 text-green-400"} hover:bg-red-900/30 hover:text-red-400 hover:border-red-700`
                        : `border ${isDha ? "border-purple-700 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40" : "border-accent-dim/30 bg-accent/10 text-accent hover:bg-accent/20"}`
                    }`}
                  >
                    {isFull ? "Complet" : isParticipating ? "✓ Participant" : "Participer"}
                  </button>
                  );
                })()}
              </div>

              {mission.members.length > 0 && (
                <div className="mt-3 border-t border-accent-dim/10 pt-3">
                  <span className="text-xs uppercase tracking-wider text-foreground/40">
                    Participants ({mission.members.length}{mission.maxParticipants > 0 ? `/${mission.maxParticipants}` : ""})
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {mission.members.map((m) => (
                      <span
                        key={m.user.id}
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          isDha ? "bg-purple-900/20 text-purple-300" : "bg-accent/10 text-accent"
                        }`}
                      >
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
