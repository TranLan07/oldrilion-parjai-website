"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Listing = {
  id: string; title: string; description: string; price: number;
  status: string; createdAt: string;
  seller: { id: string; displayName: string };
};
type Data = { listings: Listing[]; premium: boolean; canManage: boolean; clanId: string; colorPrimary: string };

const statusLabel: Record<string, string> = { active: "En vente", sold: "Vendu", cancelled: "Annulé" };
const statusColor: Record<string, string> = { active: "#22c55e", sold: "#6b7280", cancelled: "#ef4444" };

export default function ClanMarketplacePage() {
  const { slug } = useParams() as { slug: string };
  const { data: session } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/clan/${slug}/marketplace`);
    if (r.ok) setData(await r.json());
  }, [slug]);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true); setErr("");
    const r = await fetch("/api/hub/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, description: form.description, price: Number(form.price), clanId: data.clanId }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setForm({ title: "", description: "", price: "" }); setShowForm(false); load(); }
    else setErr(d.error || "Erreur");
  }

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/hub/marketplace/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`/api/hub/marketplace/${id}`, { method: "DELETE" });
    load();
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Connectez-vous.</div>;
  if (!data) return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Chargement…</div>;

  const accent = data.colorPrimary || "var(--clan-primary, var(--gold-500))";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: accent, opacity: 0.6 }}>Clan</p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-50)" }}>Marketplace</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--beskar-400)" }}>Les biens et services proposés par le clan.</p>
        </div>
        {data.canManage && (
          <button onClick={() => setShowForm(!showForm)}
            className="shrink-0 rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ borderColor: accent, color: accent, background: showForm ? `${accent}18` : "transparent" }}>
            + Annonce
          </button>
        )}
      </div>

      {!data.premium && (
        <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)", color: "var(--beskar-400)" }}>
          Le Marketplace de clan est une fonctionnalité <span style={{ color: accent }}>premium</span>.
        </div>
      )}

      {showForm && data.canManage && (
        <form onSubmit={submit} className="mb-8 rounded-sm border p-5 space-y-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>Nouvelle annonce du clan</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="rounded border px-3 py-2 text-sm outline-none" style={{ background: "var(--beskar-800)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" }} placeholder="Titre *" required />
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="rounded border px-3 py-2 text-sm outline-none" style={{ background: "var(--beskar-800)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" }} placeholder="Prix (crédits) *" required min={0} />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: "var(--beskar-800)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" }} placeholder="Description" rows={3} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ background: accent, color: "#1a1408" }}>{saving ? "..." : "Publier"}</button>
            {err && <p className="text-xs" style={{ color: "#ef4444" }}>{err}</p>}
          </div>
        </form>
      )}

      {data.listings.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "var(--beskar-600)" }}>Aucune annonce pour le moment.</p>
      )}

      <div className="space-y-3">
        {data.listings.map(l => (
          <div key={l.id} className="rounded-sm border p-5" style={{ borderColor: "var(--beskar-800)", background: "var(--beskar-900)" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-50)" }}>{l.title}</h3>
                  <span className="text-sm font-semibold" style={{ color: accent }}>{l.price} cr.</span>
                  <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase"
                    style={{ color: statusColor[l.status], border: `1px solid ${statusColor[l.status]}40` }}>
                    {statusLabel[l.status] ?? l.status}
                  </span>
                </div>
                {l.description && <p className="text-sm" style={{ color: "var(--beskar-300)" }}>{l.description}</p>}
                <p className="mt-2 text-xs" style={{ color: "var(--beskar-600)" }}>
                  Par {l.seller.displayName} · {new Date(l.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              {data.canManage && (
                <div className="flex shrink-0 gap-2">
                  {l.status === "active" && (
                    <button onClick={() => changeStatus(l.id, "sold")} className="rounded-sm border px-3 py-1 text-xs" style={{ borderColor: "#22c55e40", color: "#22c55e" }}>Vendu</button>
                  )}
                  <button onClick={() => remove(l.id)} className="rounded-sm border px-3 py-1 text-xs" style={{ borderColor: "#ef444440", color: "#ef4444" }}>Supprimer</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
