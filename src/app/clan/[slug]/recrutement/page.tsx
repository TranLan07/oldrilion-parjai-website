"use client";
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function RecrutementPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const [submitted, setSubmitted] = useState(false);

  if (session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-accent">Vous êtes déjà membre</h1>
        <p className="mt-2 text-foreground/50">Vous faites déjà partie de ce clan.</p>
        <Link href="/profil" className="mt-6 rounded bg-accent px-6 py-2 font-medium uppercase text-background hover:bg-accent-dim">
          Voir mon profil
        </Link>
      </div>
    );
  }
  const [form, setForm] = useState({ rpName: "", discord: "", experience: "", motivation: "", specialization: "" });

  const inputClass = "w-full rounded border border-accent-dim/30 bg-surface px-4 py-3 text-foreground outline-none transition-colors focus:border-accent";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/clan/${slug}/admin/recruitment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="mb-4 text-4xl font-bold tracking-widest text-accent">RECRUTEMENT</h1>
      <p className="mb-12 text-foreground/60">
        Tu veux rejoindre ce clan ? Remplis ce formulaire et un officier te contactera.
      </p>

      {submitted ? (
        <div className="rounded-lg border border-green-800/40 bg-green-900/10 p-8 text-center">
          <p className="text-xl font-semibold text-green-400">Candidature envoyée !</p>
          <p className="mt-2 text-foreground/60">Oya manda — Un officier te contactera bientôt.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Nom RP</label>
            <input type="text" required value={form.rpName} onChange={(e) => setForm({ ...form, rpName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Discord</label>
            <input type="text" required value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Spécialisation souhaitée</label>
            <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className={inputClass}>
              <option value="">Choisir...</option>
              <option value="Kyramud">Kyramud (Guerrier)</option>
              <option value="Goran">Goran (Forgeron)</option>
              <option value="Mirdala">Mirdala (Stratège)</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Expérience RP</label>
            <textarea rows={4} required value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}
              className={`resize-none ${inputClass}`} />
          </div>
          <div>
            <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Motivation</label>
            <textarea rows={4} required value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })}
              className={`resize-none ${inputClass}`} />
          </div>
          <button type="submit" className="w-full rounded bg-accent py-3 font-medium uppercase tracking-wider text-background transition-colors hover:bg-accent-dim">
            Envoyer la candidature
          </button>
        </form>
      )}
    </div>
  );
}
