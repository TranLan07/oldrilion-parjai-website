"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  if (session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Identifiants incorrects");
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <h1 className="text-3xl font-bold tracking-widest text-accent">CONNEXION</h1>

        {error && (
          <p className="rounded bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</p>
        )}

        <div>
          <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">
            Nom d&apos;utilisateur
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded border border-accent-dim/30 bg-surface px-4 py-3 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm uppercase tracking-wider text-foreground/70">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-accent-dim/30 bg-surface px-4 py-3 text-foreground outline-none focus:border-accent"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-accent py-3 font-medium uppercase tracking-wider text-background transition-colors hover:bg-accent-dim"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
