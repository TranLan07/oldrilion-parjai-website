"use client";

import { useState } from "react";

const types = [
  { value: "rgpd", label: "Demande RGPD (accès, rectification, suppression)" },
  { value: "recrutement", label: "Question sur un clan / recrutement" },
  { value: "bug", label: "Signalement de bug ou problème technique" },
  { value: "autre", label: "Autre demande" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", type: "rgpd", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus("sending");
    const r = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setStatus("sent");
    } else {
      const d = await r.json();
      setErrMsg(d.error ?? "Erreur");
      setStatus("error");
    }
  }

  const inputSt = { background: "#111", borderColor: "#2a2a2a", color: "#f2f2f5" };

  if (status === "sent") return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Envoyé</p>
      <h1 className="mb-4 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Demande reçue</h1>
      <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
        Votre message a bien été transmis aux administrateurs du Hub. Nous vous répondrons à l'adresse indiquée dans les meilleurs délais.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Contact & RGPD</h1>
      <p className="mb-10 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
        Pour toute demande relative à vos données personnelles (accès, rectification, suppression — conformément au RGPD),
        ou pour toute autre question concernant le Hub, utilisez ce formulaire.
        Un administrateur traitera votre demande dans les meilleurs délais.
      </p>

      {status === "error" && (
        <div className="mb-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#ef444440", background: "#ef44440a", color: "#ef4444" }}>
          {errMsg}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
              Nom / Pseudo *
            </label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}
              placeholder="Votre nom" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
              Email *
            </label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}
              placeholder="votre@email.com" required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
            Type de demande *
          </label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}>
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
            Objet
          </label>
          <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            className="w-full rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}
            placeholder="Résumé en quelques mots" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#4a4a4a" }}>
            Message *
          </label>
          <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            rows={6} className="w-full resize-none rounded-sm border px-3 py-2 text-sm outline-none" style={inputSt}
            placeholder="Décrivez votre demande en détail..." required />
        </div>

        <p className="text-xs" style={{ color: "#3a3a3a" }}>
          Les informations fournies seront uniquement utilisées pour traiter votre demande et ne seront pas partagées avec des tiers.
        </p>

        <button type="submit" disabled={status === "sending"}
          className="rounded-sm px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] transition-all disabled:opacity-50"
          style={{ background: "#f2f2f5", color: "#000" }}>
          {status === "sending" ? "Envoi..." : "Envoyer la demande"}
        </button>
      </form>
    </div>
  );
}
