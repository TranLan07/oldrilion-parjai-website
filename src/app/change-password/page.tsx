"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (!session) {
    return <div className="p-12 text-center text-foreground/50">Connectez-vous d&apos;abord.</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Le mot de passe doit faire au moins 4 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } else {
      const data = await res.json();
      setError(data.error || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-accent">NOUVEAU MOT DE PASSE</h1>
          <p className="mt-2 text-sm text-foreground/50">
            Vous devez changer votre mot de passe temporaire.
          </p>
        </div>

        {error && <p className="rounded bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</p>}
        {success && <p className="rounded bg-green-900/30 px-4 py-2 text-sm text-green-400">Mot de passe changé ! Redirection...</p>}

        <div>
          <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Nouveau mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full rounded border border-accent-dim/30 bg-surface px-4 py-3 text-foreground outline-none focus:border-accent" />
        </div>

        <div>
          <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">Confirmer</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
            className="w-full rounded border border-accent-dim/30 bg-surface px-4 py-3 text-foreground outline-none focus:border-accent" />
        </div>

        <button type="submit" className="w-full rounded bg-accent py-3 font-medium uppercase tracking-wider text-background hover:bg-accent-dim">
          Changer le mot de passe
        </button>
      </form>
    </div>
  );
}
