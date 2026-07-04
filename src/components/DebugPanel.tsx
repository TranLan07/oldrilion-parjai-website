"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useDebug } from "./DebugContext";

// Fenêtre flottante de simulation, affichée sur le côté quand le mode debug est actif.
export default function DebugPanel() {
  const dbg = useDebug();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  if (!dbg || !dbg.enabled) return null;

  const realPerm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) ?? 0;
  const effPerm = dbg.perm ?? realPerm;

  return (
    <div className="fixed right-3 top-1/2 z-[100] -translate-y-1/2 w-64 rounded-lg border shadow-2xl"
      style={{ borderColor: "#c9a84c66", background: "rgba(12,12,14,0.97)", backdropFilter: "blur(8px)" }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#c9a84c33" }}>
        <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "#c9a84c" }}>⚙ Mode debug</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(c => !c)} title={collapsed ? "Déplier" : "Replier"}
            className="rounded px-1.5 text-xs" style={{ color: "#9ca3af", border: "1px solid #2a2a2a" }}>{collapsed ? "▸" : "▾"}</button>
          <button onClick={() => dbg.set({ enabled: false })} title="Fermer le mode debug"
            className="rounded px-1.5 text-xs" style={{ color: "#ef4444", border: "1px solid #2a2a2a" }}>✕</button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3 p-3">
          <p className="text-[10px] leading-tight" style={{ color: "#6b7280" }}>
            Simule l&apos;affichage pour un utilisateur ayant ces paramètres. Aucune donnée n&apos;est modifiée.
          </p>

          {/* Niveau d'accès */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Niveau d&apos;accès</label>
              <span className="text-xs font-mono font-bold" style={{ color: "#c9a84c" }}>{effPerm}</span>
            </div>
            <input type="range" min={0} max={10} step={1} value={effPerm}
              onChange={e => dbg.set({ perm: Number(e.target.value) })}
              className="w-full accent-[#c9a84c]" />
            <div className="mt-1 flex justify-between text-[9px]" style={{ color: "#4a4a4a" }}>
              <span>0 · visiteur</span><span>10 · admin</span>
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Grade simulé</label>
            <input value={dbg.grade} onChange={e => dbg.set({ grade: e.target.value })}
              placeholder="ex : Ver'alor"
              className="w-full rounded border px-2 py-1.5 text-xs outline-none"
              style={{ background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" }} />
          </div>

          {/* Spécialisation */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Spécialisation simulée</label>
            <input value={dbg.spec} onChange={e => dbg.set({ spec: e.target.value })}
              placeholder="ex : Kyramud"
              className="w-full rounded border px-2 py-1.5 text-xs outline-none"
              style={{ background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" }} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => dbg.set({ perm: null, grade: "", spec: "" })}
              className="flex-1 rounded border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>
              Réinitialiser
            </button>
          </div>
          <p className="text-[9px]" style={{ color: "#4a4a4a" }}>
            Réel : niveau {realPerm}. La navigation reflète le niveau simulé.
          </p>
        </div>
      )}
    </div>
  );
}
