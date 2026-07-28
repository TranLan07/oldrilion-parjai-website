"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Member = { id: string; publicId: string; displayName: string; avatarUrl: string | null; grade: string; specialization: string };

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
        <>
          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-sm border px-4 py-3"
                style={{ borderColor: "var(--beskar-600)", background: "var(--beskar-800)" }}>
                <Avatar src={m.avatarUrl} name={m.displayName} size={40} color="#c9a84c" />
                <div className="min-w-0 flex-1">
                  <Link href={`/user/${m.publicId}`} className="block font-medium truncate hover:underline" style={{ color: "var(--beskar-100)" }}>{m.displayName}</Link>
                  <p className="text-xs truncate" style={{ fontFamily: "var(--font-mono)", color: "var(--beskar-400)" }}>{m.grade}</p>
                </div>
                <span className="shrink-0 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]"
                  style={{
                    fontFamily: "var(--font-display)",
                    background: "color-mix(in srgb, var(--clan-primary, #c9a84c) 10%, transparent)",
                    color: "var(--clan-primary, #c9a84c)",
                    border: "1px solid color-mix(in srgb, var(--clan-primary, #c9a84c) 20%, transparent)",
                  }}>
                  {m.specialization}
                </span>
              </div>
            ))}
          </div>

          {/* Table — md+ */}
          <div className="hidden overflow-x-auto rounded-sm md:block" style={{ border: "1px solid var(--beskar-600)" }}>
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
                        <Avatar src={m.avatarUrl} name={m.displayName} size={32} color="#c9a84c" />
                        <Link href={`/user/${m.publicId}`} className="font-medium hover:underline" style={{ color: "var(--beskar-100)" }}>{m.displayName}</Link>
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
        </>
      )}

      <p className="mt-6 text-xs" style={{ color: "var(--beskar-400)" }}>
        {members.length} membre{members.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}
