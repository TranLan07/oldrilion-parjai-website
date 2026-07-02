"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type Transaction = {
  id: string; type: string; amount: number; label: string | null; createdAt: string;
  author: { id: string; displayName: string };
};
type BanqueData = { balance: number; transactions: Transaction[]; premium: boolean; perm: number };

const inp = { background: "var(--beskar-900)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" };

export default function BanquePage() {
  const { slug } = useParams() as { slug: string };
  const { data: session } = useSession();
  const [data, setData] = useState<BanqueData | null>(null);
  const [form, setForm] = useState({ type: "depot", amount: "", label: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/clan/${slug}/banque`);
    if (r.ok) setData(await r.json());
    else setErr("Accès refusé");
  }, [slug]);

  useEffect(() => { if (session) load(); }, [session, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(""); setErr("");
    const r = await fetch(`/api/clan/${slug}/banque`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: form.type, amount: Number(form.amount), label: form.label }),
    });
    const d = await r.json();
    if (r.ok) { setForm({ type: "depot", amount: "", label: "" }); setMsg("Transaction enregistrée."); load(); }
    else setErr(d.error || "Erreur");
    setSaving(false);
  }

  if (!session) return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Connectez-vous.</div>;
  if (err && !data) return <div className="p-12 text-center text-sm" style={{ color: "#ef4444" }}>{err}</div>;
  if (!data) return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Chargement…</div>;

  const isAdmin = data.perm >= 10;
  const canDepot = data.premium
    ? data.perm >= 1
    : isAdmin;
  const canRetrait = data.premium
    ? data.perm >= 1
    : isAdmin;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--clan-primary, var(--gold-500))", opacity: 0.6 }}>Clan</p>
        <h1 className="text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-50)" }}>Banque</h1>
      </div>

      {/* Solde */}
      <div className="mb-8 rounded-sm border p-6" style={{ borderColor: "var(--clan-primary, var(--beskar-600))", background: "var(--beskar-900)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--beskar-400)" }}>Solde actuel</p>
        <p className="mt-1 text-5xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--clan-primary, var(--gold-500))" }}>
          {data.balance.toLocaleString("fr-FR")} <span className="text-2xl">cr.</span>
        </p>
        {data.premium && <p className="mt-1 text-xs" style={{ color: "var(--beskar-500)" }}>★ Clan premium · historique & justificatifs activés</p>}
      </div>

      {/* Formulaire transaction */}
      {(canDepot || canRetrait) && (
        <form onSubmit={submit} className="mb-8 rounded-sm border p-5 space-y-3" style={{ borderColor: "var(--beskar-700)", background: "var(--beskar-900)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--beskar-400)" }}>Nouvelle transaction</h3>
          <div className="flex flex-wrap gap-2">
            {canDepot && (
              <button type="button" onClick={() => setForm({ ...form, type: "depot" })}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase"
                style={{ borderColor: form.type === "depot" ? "#22c55e" : "var(--beskar-600)", color: form.type === "depot" ? "#22c55e" : "var(--beskar-400)" }}>
                + Dépôt
              </button>
            )}
            {canRetrait && (
              <button type="button" onClick={() => setForm({ ...form, type: "retrait" })}
                className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase"
                style={{ borderColor: form.type === "retrait" ? "#ef4444" : "var(--beskar-600)", color: form.type === "retrait" ? "#ef4444" : "var(--beskar-400)" }}>
                − Retrait
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              className="rounded border px-3 py-2 text-sm outline-none" style={inp} placeholder="Montant (crédits) *" required min={1} />
            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
              className="rounded border px-3 py-2 text-sm outline-none" style={inp}
              placeholder={`Justificatif${data.premium && form.type === "retrait" ? " *" : ""}`}
              required={data.premium && form.type === "retrait"} />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ background: form.type === "depot" ? "#22c55e" : "#ef4444", color: "#fff" }}>
              {saving ? "..." : form.type === "depot" ? "Déposer" : "Retirer"}
            </button>
            {msg && <p className="text-xs" style={{ color: "#22c55e" }}>{msg}</p>}
            {err && <p className="text-xs" style={{ color: "#ef4444" }}>{err}</p>}
          </div>
        </form>
      )}

      {/* Historique */}
      {data.transactions.length > 0 && (
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--beskar-400)" }}>Historique</h3>
          <div className="space-y-2">
            {data.transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 rounded-sm border px-4 py-3"
                style={{ borderColor: "var(--beskar-800)", background: "var(--beskar-900)" }}>
                <span className="w-6 text-center text-lg">{tx.type === "depot" ? "+" : "−"}</span>
                <span className="w-28 font-semibold text-sm"
                  style={{ color: tx.type === "depot" ? "#22c55e" : "#ef4444" }}>
                  {tx.amount.toLocaleString("fr-FR")} cr.
                </span>
                <span className="flex-1 text-sm truncate" style={{ color: "var(--beskar-300)" }}>{tx.label || "—"}</span>
                <span className="text-xs" style={{ color: "var(--beskar-500)" }}>{tx.author.displayName}</span>
                <span className="text-xs" style={{ color: "var(--beskar-600)" }}>
                  {new Date(tx.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.transactions.length === 0 && !isAdmin && !data.premium && (
        <p className="text-sm text-center py-8" style={{ color: "var(--beskar-500)" }}>Historique disponible pour les clans premium.</p>
      )}
    </div>
  );
}
