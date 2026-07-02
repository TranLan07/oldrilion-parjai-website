"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Section = { id: string; order: number; title: string; description: string };
const DEF = { title: "", description: "", order: 0 };

export default function ReglesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const sessionClanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | undefined;
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  const isAdmin = (sessionClanSlug === slug && perm >= 10) || hubRole === "admin";

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(DEF);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/clan/${slug}/rules`).then(r => r.json()).then(d => { setSections(d); setLoading(false); });
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const method = editId ? "PUT" : "POST";
    const body = editId ? { id: editId, ...form } : form;
    await fetch(`/api/clan/${slug}/admin/rules`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowForm(false); setEditId(null); setForm(DEF); load(); setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Supprimer cette règle ?")) return;
    await fetch(`/api/clan/${slug}/admin/rules`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  function startEdit(s: Section) {
    setEditId(s.id); setForm({ title: s.title, description: s.description, order: s.order });
    setShowForm(true);
  }

  const accent = "var(--clan-primary, #c9a84c)";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: accent, opacity: 0.6 }}>Clan</p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-50)" }}>Règles</h1>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(DEF); }}
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ borderColor: accent, color: accent }}>+ Règle</button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={save} className="mb-8 rounded-sm border p-5 space-y-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: accent, fontFamily: "var(--font-display)" }}>
            {editId ? "Modifier la règle" : "Nouvelle règle"}
          </h3>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
            className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: "var(--beskar-800)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" }} placeholder="Titre *" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4}
            className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: "var(--beskar-800)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" }} placeholder="Contenu" />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-sm px-4 py-2 text-xs font-semibold uppercase disabled:opacity-50"
              style={{ background: accent, color: "#1a1408" }}>{saving ? "..." : editId ? "Enregistrer" : "Créer"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-sm px-3 py-2 text-xs" style={{ color: "var(--beskar-400)" }}>Annuler</button>
          </div>
        </form>
      )}

      {loading && <p className="py-12 text-center text-sm" style={{ color: "var(--beskar-500)" }}>Chargement…</p>}

      {!loading && sections.length === 0 && (
        <p className="py-12 text-center text-sm" style={{ color: "var(--beskar-600)" }}>Les règles du clan seront bientôt publiées…</p>
      )}

      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={s.id} className="group relative flex gap-5 rounded-sm border p-5"
            style={{ borderColor: "var(--beskar-800)", background: "var(--beskar-900)" }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: `${accent}15`, color: accent }}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold" style={{ color: "var(--beskar-100)" }}>{s.title}</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--beskar-400)" }}>{s.description}</p>
            </div>
            {isAdmin && (
              <div className="hidden gap-1.5 group-hover:flex shrink-0">
                <button onClick={() => startEdit(s)} className="rounded px-2 py-1 text-xs self-start" style={{ color: "var(--beskar-400)", border: "1px solid var(--beskar-700)" }}>✏</button>
                <button onClick={() => del(s.id)} className="rounded px-2 py-1 text-xs self-start" style={{ color: "#ef4444", border: "1px solid var(--beskar-700)" }}>✕</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
