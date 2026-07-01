"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Member = { id: string; displayName: string; grade: string; specialization: string };

export default function MembresPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clan/${slug}/members`).then(r => r.json()).then(d => { setMembers(d); setLoading(false); });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
        MEMBRES
      </h1>
      <div className="mb-10 h-px w-16" style={{ background: "var(--grad-edge)" }} />

      {loading && <p style={{ color: "var(--beskar-400)" }}>Chargement...</p>}

      {!loading && members.length === 0 && (
        <p className="py-12 text-center" style={{ color: "var(--beskar-400)" }}>Aucun membre pour le moment.</p>
      )}

      {!loading && members.length > 0 && (
        <div className="overflow-x-auto rounded-sm" style={{ border: "1px solid var(--beskar-600)" }}>
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: "var(--beskar-700)" }}>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, #c9a84c)" }}>Nom</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, #c9a84c)" }}>Grade</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, #c9a84c)" }}>Spécialisation</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="transition-colors"
                  style={{ background: "var(--beskar-800)", borderBottom: "1px solid var(--beskar-600)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--beskar-700)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--beskar-800)"; }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: "rgba(139,26,26,0.3)", color: "var(--beskar-100)" }}>
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: "var(--beskar-100)" }}>{m.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--beskar-200)" }}>
                      {m.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]"
                      style={{
                        fontFamily: "var(--font-display)",
                        background: "color-mix(in srgb, var(--clan-primary, #c9a84c) 10%, transparent)",
                        color: "var(--clan-primary, #c9a84c)",
                        border: "1px solid color-mix(in srgb, var(--clan-primary, #c9a84c) 20%, transparent)",
                      }}>
                      {m.specialization}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs" style={{ color: "var(--beskar-400)" }}>
        {members.length} membre{members.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}
