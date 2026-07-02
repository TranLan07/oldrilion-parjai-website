"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Seller = { id: string; displayName: string; anonymous: boolean; publicId: string };
type ClanInfo = { id: string; name: string; slug: string; colorBg: string; colorPrimary: string; colorAccent: string };
type Listing = {
  id: string; title: string; description: string; price: number;
  status: string; anonymous: boolean; createdAt: string; expiresAt: string | null;
  seller: Seller; clan: ClanInfo | null;
};

const inp = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

export default function MarketplacePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", clanId: "" });
  const [filter, setFilter] = useState<"all" | "joueur" | "clan">("all");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const userId = session?.user?.id;
  const hubRole = (session as unknown as Record<string, unknown>)?.hubRole as string | undefined;
  const userClanId = (session as unknown as Record<string, unknown>)?.clanId as string | undefined;

  const load = useCallback(async () => {
    const r = await fetch("/api/hub/marketplace");
    if (r.ok) setListings(await r.json());
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    const r = await fetch("/api/hub/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, description: form.description, price: Number(form.price), clanId: form.clanId || undefined }),
    });
    const data = await r.json();
    if (r.ok) { setShowForm(false); setForm({ title: "", description: "", price: "", clanId: "" }); load(); }
    else setMsg(data.error || "Erreur");
    setSaving(false);
  }

  async function contact(listing: Listing) {
    const r = await fetch(`/api/hub/marketplace/${listing.id}/contact`, { method: "POST" });
    if (r.ok) {
      const data = await r.json();
      router.push(`/messagerie?channel=${data.channelId}`);
    }
  }

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/hub/marketplace/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`/api/hub/marketplace/${id}`, { method: "DELETE" });
    load();
  }

  if (!session) return (
    <div className="p-12 text-center text-sm" style={{ color: "#6b7280" }}>Connectez-vous pour accéder au Marketplace.</div>
  );

  const filtered = listings.filter(l => {
    if (filter === "joueur") return !l.clan;
    if (filter === "clan") return !!l.clan;
    return true;
  });

  const isAdmin = hubRole === "admin" || hubRole === "moderator";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Marketplace</h1>
          <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>Échanges de crédits et services entre Mandalorians.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ borderColor: "#c9a84c", color: "#c9a84c", background: showForm ? "rgba(201,168,76,0.1)" : "transparent" }}>
          + Annonce
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-8 rounded-sm border p-6 space-y-4" style={{ borderColor: "#2a2a2a", background: "#0a0a0a" }}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em]" style={{ color: "#c9a84c", fontFamily: "var(--font-display)" }}>Nouvelle annonce</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Titre *" required />
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Prix (crédits) *" required min={0} />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Description" rows={3} />
          {userClanId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#9ca3af" }}>
              <input type="checkbox" checked={!!form.clanId} onChange={e => setForm({ ...form, clanId: e.target.checked ? userClanId : "" })} />
              Poster au nom de mon clan (premium requis)
            </label>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ background: "#c9a84c", color: "#1a1408" }}>{saving ? "..." : "Publier"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-sm px-4 py-2 text-xs" style={{ color: "#6b7280" }}>Annuler</button>
          </div>
          {msg && <p className="text-xs" style={{ color: "#ef4444" }}>{msg}</p>}
        </form>
      )}

      {/* Filtres */}
      <div className="mb-6 flex gap-2">
        {(["all", "joueur", "clan"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ borderColor: filter === f ? "#c9a84c" : "#2a2a2a", color: filter === f ? "#c9a84c" : "#4a4a4a", background: filter === f ? "rgba(201,168,76,0.08)" : "transparent" }}>
            {f === "all" ? "Toutes" : f === "joueur" ? "Joueurs" : "Clans"}
          </button>
        ))}
        <span className="ml-auto text-xs self-center" style={{ color: "#4a4a4a" }}>{filtered.length} annonce{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 && <p className="py-16 text-center text-sm" style={{ color: "#3a3a3a" }}>Aucune annonce active.</p>}

      <div className="space-y-4">
        {filtered.map(l => {
          const sellerName = l.anonymous ? `Anonyme [${l.seller.publicId}]` : l.seller.displayName;
          const accent = l.clan?.colorPrimary ?? "#c9a84c";
          const isOwn = l.seller.id === userId || (l.clan && l.clan.id === userClanId);
          const canManage = isOwn || isAdmin;

          return (
            <div key={l.id} className="rounded-sm border p-5" style={{ borderColor: "#1e1e1e", background: "#0d0d0d" }}>
              <div className="mb-4 -mx-5 -mt-5 h-0.5" style={{ background: `linear-gradient(90deg, ${accent}80, transparent)` }} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>{l.title}</h3>
                    <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>{l.price} cr.</span>
                    {l.clan && (
                      <span className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase"
                        style={{ color: accent, border: `1px solid ${accent}40`, background: `${accent}10` }}>
                        {l.clan.name}
                      </span>
                    )}
                  </div>
                  {l.description && <p className="text-sm" style={{ color: "#6b7280" }}>{l.description}</p>}
                  <p className="mt-2 text-xs" style={{ color: "#3a3a3a" }}>
                    Par {sellerName} · {new Date(l.createdAt).toLocaleDateString("fr-FR")}
                    {l.expiresAt && ` · expire le ${new Date(l.expiresAt).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 items-end">
                  {!isOwn && (
                    <button onClick={() => contact(l)}
                      className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                      style={{ borderColor: "#c9a84c", color: "#c9a84c", background: "rgba(201,168,76,0.08)" }}>
                      Contacter
                    </button>
                  )}
                  {canManage && (
                    <div className="flex gap-2">
                      {isOwn && l.status === "active" && (
                        <button onClick={() => changeStatus(l.id, "sold")}
                          className="rounded-sm border px-3 py-1 text-xs"
                          style={{ borderColor: "#22c55e40", color: "#22c55e" }}>Vendu</button>
                      )}
                      <button onClick={() => remove(l.id)}
                        className="rounded-sm border px-3 py-1 text-xs"
                        style={{ borderColor: "#ef444440", color: "#ef4444" }}>Supprimer</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
