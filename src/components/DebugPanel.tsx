"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDebug } from "./DebugContext";

type Clan = { id: string; slug: string; name: string };

const selStyle = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };
const labelStyle = "mb-1 block text-[11px] font-semibold uppercase tracking-wider";

// Fenêtre flottante de simulation, affichée sur le côté quand le mode debug est actif.
export default function DebugPanel() {
  const dbg = useDebug();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [clans, setClans] = useState<Clan[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [maxPerm, setMaxPerm] = useState(10);

  const realClanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | undefined;
  const effClanSlug = dbg?.clanSlug || realClanSlug || "";

  // Liste des clans (pour le sélecteur de clan)
  useEffect(() => {
    if (!dbg?.enabled) return;
    fetch("/api/hub/clans").then(r => r.ok ? r.json() : []).then((d: Clan[]) => setClans(d)).catch(() => {});
  }, [dbg?.enabled]);

  // Grades / spés du clan effectivement sélectionné
  useEffect(() => {
    if (!dbg?.enabled || !effClanSlug) { setGrades([]); setSpecs([]); setMaxPerm(10); return; }
    fetch(`/api/clan/${effClanSlug}/roster-config`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setGrades((d.grades || []).map((g: { name: string }) => g.name));
        setSpecs((d.specs || []).map((s: { name: string }) => s.name));
        setMaxPerm(d.maxPermission || 10);
      }
    }).catch(() => {});
  }, [dbg?.enabled, effClanSlug]);

  if (!dbg || !dbg.enabled) return null;

  const realPerm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) ?? 0;
  const disabled = dbg.visitor; // en mode visiteur, les autres réglages sont ignorés

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
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
          <p className="text-[10px] leading-tight" style={{ color: "#6b7280" }}>
            Simule l&apos;affichage pour un utilisateur ayant ces paramètres. Aucune donnée n&apos;est modifiée.
          </p>

          <fieldset disabled={disabled} className="space-y-3" style={{ opacity: disabled ? 0.4 : 1 }}>
            {/* 1. Permission HUB */}
            <div>
              <label className={labelStyle} style={{ color: "#9ca3af" }}>Permission HUB</label>
              <select value={dbg.hubRole} onChange={e => dbg.set({ hubRole: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={selStyle}>
                <option value="">Réel</option>
                <option value="member">Membre</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* 2. Clan */}
            <div>
              <label className={labelStyle} style={{ color: "#9ca3af" }}>Clan</label>
              <select value={dbg.clanSlug} onChange={e => {
                const c = clans.find(cl => cl.slug === e.target.value);
                dbg.set({ clanSlug: e.target.value, clanId: c?.id ?? "", grade: "", spec: "" });
              }} className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={selStyle}>
                <option value="">Réel</option>
                {clans.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>

            {/* 3. Grade */}
            <div>
              <label className={labelStyle} style={{ color: "#9ca3af" }}>Grade</label>
              <select value={dbg.grade} onChange={e => dbg.set({ grade: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-xs outline-none disabled:opacity-50" style={selStyle}
                disabled={grades.length === 0}>
                <option value="">Réel</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* 4. Spécialisation */}
            <div>
              <label className={labelStyle} style={{ color: "#9ca3af" }}>Spécialisation</label>
              <select value={dbg.spec} onChange={e => dbg.set({ spec: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-xs outline-none disabled:opacity-50" style={selStyle}
                disabled={specs.length === 0}>
                <option value="">Réel</option>
                {specs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 5. Nom */}
            <div>
              <label className={labelStyle} style={{ color: "#9ca3af" }}>Nom affiché</label>
              <input value={dbg.name} onChange={e => dbg.set({ name: e.target.value })}
                placeholder="Réel" className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={selStyle} />
            </div>

            {/* 6. Niveau de permission clan custom */}
            <div>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#9ca3af" }}>
                <input type="checkbox" checked={dbg.customPerm} onChange={e => dbg.set({ customPerm: e.target.checked })} style={{ accentColor: "#c9a84c" }} />
                Niveau de permission clan custom
              </label>
              {dbg.customPerm && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#6b7280" }}>Niveau</span>
                    <span className="text-xs font-mono font-bold" style={{ color: "#c9a84c" }}>{dbg.perm}</span>
                  </div>
                  <input type="range" min={0} max={maxPerm} step={1} value={dbg.perm}
                    onChange={e => dbg.set({ perm: Number(e.target.value) })} className="w-full accent-[#c9a84c]" />
                  <div className="mt-1 flex justify-between text-[9px]" style={{ color: "#4a4a4a" }}>
                    <span>0</span><span>{maxPerm}</span>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* 7. Vision visiteur sans compte */}
          <label className="flex items-center gap-2 text-xs cursor-pointer border-t pt-3" style={{ color: "#9ca3af", borderColor: "#2a2a2a" }}>
            <input type="checkbox" checked={dbg.visitor} onChange={e => dbg.set({ visitor: e.target.checked })} style={{ accentColor: "#ef4444" }} />
            Vision d&apos;un visiteur sans compte
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={() => dbg.set({ visitor: false, hubRole: "", clanSlug: "", clanId: "", grade: "", spec: "", name: "", customPerm: false, perm: 1 })}
              className="flex-1 rounded border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ borderColor: "#2a2a2a", color: "#9ca3af" }}>
              Réinitialiser
            </button>
          </div>
          <p className="text-[9px]" style={{ color: "#4a4a4a" }}>Réel : niveau {realPerm}. La navigation reflète la simulation.</p>
        </div>
      )}
    </div>
  );
}
