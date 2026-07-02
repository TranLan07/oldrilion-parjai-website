"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Tag = { id: string; name: string };
type ClanRef = { id: string; name: string; slug: string; colorPrimary: string };
type Entry = {
  id: string; type: string; order: number;
  targetClanId: string | null; targetClan: ClanRef | null; customName: string | null;
  tags: Tag[];
};
type ClanInfo = { id: string; name: string; slug: string };
type DipData = { entries: Entry[]; premium: boolean };
type AdminData = { entries: Entry[]; tags: Tag[]; allClans: ClanInfo[]; premium: boolean };

const inp = { background: "var(--beskar-900)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" };

export default function DiplomatiePage() {
  const { slug } = useParams() as { slug: string };
  const { data: session } = useSession();
  const perm = ((session as unknown as Record<string, unknown>)?.permissionLevel as number) || 0;
  const sessionClanSlug = (session as unknown as Record<string, unknown>)?.clanSlug as string | undefined;
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  const isAdmin = (sessionClanSlug === slug && perm >= 10) || hubRole === "admin";

  const [data, setData] = useState<DipData | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "allie", targetClanId: "", customName: "", order: 0, tagIds: [] as string[] });
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/clan/${slug}/diplomatie`);
    if (r.ok) setData(await r.json());
    else setErr("Accès refusé");
  }, [slug]);

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) return;
    const r = await fetch(`/api/clan/${slug}/admin/diplomatie`);
    if (r.ok) setAdminData(await r.json());
  }, [slug, isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) loadAdmin(); }, [loadAdmin, isAdmin]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch(`/api/clan/${slug}/admin/diplomatie`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, targetClanId: form.targetClanId || null, customName: form.customName || null }),
    });
    if (r.ok) { setShowForm(false); setForm({ type: "allie", targetClanId: "", customName: "", order: 0, tagIds: [] }); load(); loadAdmin(); }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Supprimer cette entrée ?")) return;
    await fetch(`/api/clan/${slug}/admin/diplomatie`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load(); loadAdmin();
  }

  async function createTag() {
    if (!newTag.trim()) return;
    await fetch(`/api/clan/${slug}/admin/diplomatie/tag`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag.trim() }),
    });
    setNewTag(""); loadAdmin();
  }

  if (err) return <div className="p-12 text-center text-sm" style={{ color: "#ef4444" }}>{err}</div>;
  if (!data) return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Chargement…</div>;

  const allies = data.entries.filter(e => e.type === "allie");
  const ennemis = data.entries.filter(e => e.type === "ennemi");

  function EntryCard({ entry }: { entry: Entry }) {
    const name = entry.targetClan?.name ?? entry.customName ?? "Inconnu";
    const color = entry.targetClan?.colorPrimary ?? (entry.type === "allie" ? "#22c55e" : "#ef4444");
    const link = entry.targetClan ? `/clan/${entry.targetClan.slug}` : null;

    return (
      <div className="flex items-start gap-3 rounded-sm border p-4" style={{ borderColor: "var(--beskar-800)", background: "var(--beskar-900)" }}>
        <div className="mt-0.5 h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          {link ? (
            <Link href={link} className="font-semibold hover:underline" style={{ color: "var(--beskar-100)" }}>{name}</Link>
          ) : (
            <span className="font-semibold" style={{ color: "var(--beskar-100)" }}>{name}</span>
          )}
          {entry.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.tags.map(t => (
                <span key={t.id} className="rounded-sm px-1.5 py-0.5 text-xs"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{t.name}</span>
              ))}
            </div>
          )}
        </div>
        {isAdmin && (
          <button onClick={() => deleteEntry(entry.id)} className="text-xs shrink-0" style={{ color: "var(--beskar-600)" }}>✕</button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--clan-primary, var(--gold-500))", opacity: 0.6 }}>Clan</p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-50)" }}>Diplomatie</h1>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ borderColor: "var(--clan-primary, var(--gold-500))", color: "var(--clan-primary, var(--gold-500))" }}>
            + Entrée
          </button>
        )}
      </div>

      {/* Formulaire admin */}
      {isAdmin && showForm && (
        <form onSubmit={addEntry} className="mb-8 rounded-sm border p-5 space-y-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
          <div className="flex gap-2">
            {["allie", "ennemi"].map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase"
                style={{
                  borderColor: form.type === t ? (t === "allie" ? "#22c55e" : "#ef4444") : "var(--beskar-600)",
                  color: form.type === t ? (t === "allie" ? "#22c55e" : "#ef4444") : "var(--beskar-400)",
                }}>
                {t === "allie" ? "Allié" : "Ennemi"}
              </button>
            ))}
          </div>
          {adminData && (
            <select value={form.targetClanId} onChange={e => setForm({ ...form, targetClanId: e.target.value, customName: "" })}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp}>
              <option value="">— Clan personnalisé —</option>
              {adminData.allClans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {!form.targetClanId && (
            <input value={form.customName} onChange={e => setForm({ ...form, customName: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Nom personnalisé *" />
          )}
          {adminData?.premium && adminData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {adminData.tags.map(t => (
                <button key={t.id} type="button"
                  onClick={() => setForm({ ...form, tagIds: form.tagIds.includes(t.id) ? form.tagIds.filter(x => x !== t.id) : [...form.tagIds, t.id] })}
                  className="rounded-sm border px-2 py-0.5 text-xs"
                  style={{ borderColor: form.tagIds.includes(t.id) ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-700)", color: form.tagIds.includes(t.id) ? "var(--clan-primary, var(--gold-500))" : "var(--beskar-500)" }}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || (!form.targetClanId && !form.customName.trim())}
              className="rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>
              {saving ? "..." : "Ajouter"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-sm px-3 py-2 text-xs" style={{ color: "var(--beskar-400)" }}>Annuler</button>
          </div>
        </form>
      )}

      {/* Tags admin */}
      {isAdmin && adminData?.premium && (
        <div className="mb-6 rounded-sm border p-4" style={{ borderColor: "var(--beskar-800)", background: "var(--beskar-900)" }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--beskar-400)" }}>Tags (premium)</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {adminData.tags.map(t => (
              <div key={t.id} className="flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs" style={{ borderColor: "var(--beskar-700)", color: "var(--beskar-300)" }}>
                {t.name}
                <button onClick={async () => {
                  await fetch(`/api/clan/${slug}/admin/diplomatie/tag`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) });
                  loadAdmin();
                }} style={{ color: "var(--beskar-600)" }}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), createTag())}
              className="rounded border px-3 py-1.5 text-xs outline-none" style={inp} placeholder="Nouveau tag…" />
            <button onClick={createTag} className="rounded-sm px-3 py-1.5 text-xs" style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>+</button>
          </div>
        </div>
      )}

      {/* Contenu */}
      {data.entries.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "var(--beskar-600)" }}>Aucune entrée diplomatique.</p>
      )}

      {allies.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#22c55e" }}>Alliés</h2>
          <div className="space-y-2">{allies.map(e => <EntryCard key={e.id} entry={e} />)}</div>
        </div>
      )}

      {ennemis.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#ef4444" }}>Ennemis</h2>
          <div className="space-y-2">{ennemis.map(e => <EntryCard key={e.id} entry={e} />)}</div>
        </div>
      )}
    </div>
  );
}
