"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Spec = { id: string; name: string; description: string };
type Field = { id: string; label: string; type: string; options: string[]; required: boolean; order: number };
type Config = {
  clanName: string; colorBg: string; colorPrimary: string; colorAccent: string;
  specializations: Spec[]; grades: string[]; fields: Field[];
};

export default function RecrutementPage() {
  const { slug } = useParams() as { slug: string };
  const { data: session } = useSession();
  const clanId = (session as unknown as Record<string, unknown>)?.clanId as string | undefined;

  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({ rpName: "", discord: "", experience: "", motivation: "", specialization: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/clan/${slug}/recruitment`);
    if (r.ok) setConfig(await r.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Accessible aux non-connectés et aux sans-clan. Bloqué seulement pour un membre de clan.
  if (session && clanId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--clan-primary, var(--gold-500))" }}>Vous appartenez déjà à un clan</h1>
        <p className="mt-2" style={{ color: "var(--beskar-400)" }}>Quittez votre clan actuel pour candidater ailleurs.</p>
        <Link href="/profil" className="mt-6 rounded px-6 py-2 font-medium uppercase" style={{ background: "var(--clan-primary, var(--gold-500))", color: "#1a1408" }}>
          Voir mon profil
        </Link>
      </div>
    );
  }

  if (!config) return <div className="p-12 text-center text-sm" style={{ color: "var(--beskar-400)" }}>Chargement…</div>;

  const accent = config.colorPrimary || "var(--clan-primary, var(--gold-500))";
  const inputClass = "w-full rounded border px-4 py-3 text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--beskar-900)", borderColor: "var(--beskar-600)", color: "var(--beskar-100)" };

  function setAnswer(id: string, value: string) { setAnswers(a => ({ ...a, [id]: value })); }

  function toggleCheckbox(id: string, option: string) {
    setAnswers(a => {
      const current = (a[id] || "").split("|").filter(Boolean);
      const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
      return { ...a, [id]: next.join("|") };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr("");
    const customAnswers = (config!.fields || []).map(f => ({
      id: f.id,
      value: f.type === "checkbox" ? (answers[f.id] || "").split("|").filter(Boolean).join(", ") : (answers[f.id] || ""),
    }));
    const r = await fetch(`/api/clan/${slug}/recruitment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customAnswers }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) setSubmitted(true);
    else setErr(d.error || "Erreur lors de l'envoi");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:py-20">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: accent, opacity: 0.6 }}>{config.clanName}</p>
      <h1 className="mb-4 text-4xl font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-display)", color: accent }}>Recrutement</h1>
      <p className="mb-10 text-sm" style={{ color: "var(--beskar-300)" }}>
        Tu veux rejoindre ce clan ? Remplis ce formulaire et un officier te contactera.
      </p>

      {submitted ? (
        <div className="rounded-lg border p-8 text-center" style={{ borderColor: "#22c55e40", background: "rgba(34,197,94,0.08)" }}>
          <p className="text-xl font-semibold" style={{ color: "#22c55e" }}>Candidature envoyée !</p>
          <p className="mt-2" style={{ color: "var(--beskar-300)" }}>Oya manda — Un officier te contactera bientôt.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="Nom RP" required>
            <input type="text" required value={form.rpName} onChange={e => setForm({ ...form, rpName: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Discord" required>
            <input type="text" required value={form.discord} onChange={e => setForm({ ...form, discord: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Spécialisation souhaitée">
            <select value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} className={inputClass} style={inputStyle}>
              <option value="">Choisir…</option>
              {config.specializations.map(s => <option key={s.id} value={s.name}>{s.name}{s.description ? ` — ${s.description.slice(0, 50)}` : ""}</option>)}
            </select>
          </Field>
          <Field label="Expérience RP" required>
            <textarea rows={4} required value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} className={`resize-none ${inputClass}`} style={inputStyle} />
          </Field>
          <Field label="Motivation" required>
            <textarea rows={4} required value={form.motivation} onChange={e => setForm({ ...form, motivation: e.target.value })} className={`resize-none ${inputClass}`} style={inputStyle} />
          </Field>

          {/* Champs personnalisés (premium) */}
          {config.fields.map(f => (
            <Field key={f.id} label={f.label} required={f.required} accent={accent}>
              {f.type === "text" && (
                <input type="text" required={f.required} value={answers[f.id] || ""} onChange={e => setAnswer(f.id, e.target.value)} className={inputClass} style={inputStyle} />
              )}
              {f.type === "textarea" && (
                <textarea rows={4} required={f.required} value={answers[f.id] || ""} onChange={e => setAnswer(f.id, e.target.value)} className={`resize-none ${inputClass}`} style={inputStyle} />
              )}
              {f.type === "radio" && (
                <div className="space-y-2">
                  {f.options.map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--beskar-200)" }}>
                      <input type="radio" name={f.id} required={f.required} checked={answers[f.id] === opt} onChange={() => setAnswer(f.id, opt)} style={{ accentColor: accent }} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {f.type === "checkbox" && (
                <div className="space-y-2">
                  {f.options.map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--beskar-200)" }}>
                      <input type="checkbox" checked={(answers[f.id] || "").split("|").includes(opt)} onChange={() => toggleCheckbox(f.id, opt)} style={{ accentColor: accent }} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {/* Sélection parmi les spés publiques du clan */}
              {f.type === "specialization" && (
                <select required={f.required} value={answers[f.id] || ""} onChange={e => setAnswer(f.id, e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Choisir une spécialisation…</option>
                  {config!.specializations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              )}
              {/* Sélection parmi les grades du clan */}
              {f.type === "grade" && (
                <select required={f.required} value={answers[f.id] || ""} onChange={e => setAnswer(f.id, e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="">Choisir un grade…</option>
                  {config!.grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </Field>
          ))}

          {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded py-3 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
            style={{ background: accent, color: "#1a1408" }}>
            {saving ? "Envoi…" : "Envoyer la candidature"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, required, children, accent }: { label: string; required?: boolean; children: React.ReactNode; accent?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm uppercase tracking-wider" style={{ color: "var(--beskar-300)" }}>
        {label} {required && <span style={{ color: accent ?? "#ef4444" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
