"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type WordResult = { original: string; translated: string; found: boolean };
type TranslationResult = {
  input: string;
  output: string;
  direction: "fr-to-mandoa" | "mandoa-to-fr";
  words: WordResult[];
};

export default function TraducteurPage() {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [direction, setDirection] = useState<"fr-to-mandoa" | "mandoa-to-fr">("fr-to-mandoa");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!session) {
    return <div className="p-12 text-center text-foreground/50">Connectez-vous pour accéder au traducteur.</div>;
  }

  async function handleTranslate() {
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, direction }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  function swap() {
    setDirection(direction === "fr-to-mandoa" ? "mandoa-to-fr" : "fr-to-mandoa");
    if (result) {
      setText(result.output);
      setResult(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 text-4xl font-bold tracking-widest text-accent">TRADUCTEUR</h1>
      <p className="mb-10 text-foreground/50">
        Traduction bidirectionnelle Français ↔ Mando&apos;a
      </p>

      {/* Direction toggle */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className={`text-sm font-medium uppercase tracking-wider ${
          direction === "fr-to-mandoa" ? "text-accent" : "text-foreground/50"
        }`}>
          Français
        </span>
        <button
          onClick={swap}
          className="rounded-full border border-accent-dim/30 p-2 transition-colors hover:border-accent hover:text-accent"
          title="Inverser"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
        <span className={`text-sm font-medium uppercase tracking-wider ${
          direction === "mandoa-to-fr" ? "text-accent" : "text-foreground/50"
        }`}>
          Mando&apos;a
        </span>
      </div>

      {/* Input / Output */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-foreground/50">
            {direction === "fr-to-mandoa" ? "Français" : "Mando'a"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTranslate(); } }}
            rows={6}
            placeholder={direction === "fr-to-mandoa" ? "Écrivez en français..." : "Copaanir mando'a..."}
            className="w-full resize-none rounded-lg border border-accent-dim/30 bg-surface px-4 py-3 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-foreground/50">
            {direction === "fr-to-mandoa" ? "Mando'a" : "Français"}
          </label>
          <div className="min-h-[168px] rounded-lg border border-accent-dim/20 bg-surface-light px-4 py-3">
            {result ? (
              <p className="text-lg text-accent">{result.output}</p>
            ) : (
              <p className="text-foreground/30">La traduction apparaîtra ici...</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={handleTranslate}
          disabled={loading || !text.trim()}
          className="rounded bg-accent px-8 py-3 font-medium uppercase tracking-wider text-background transition-colors hover:bg-accent-dim disabled:opacity-50"
        >
          {loading ? "Traduction..." : "Traduire"}
        </button>
      </div>

      {/* Détail mot à mot */}
      {result && result.words.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
            Détail mot à mot
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.words.map((w, i) => (
              <div
                key={i}
                className={`rounded border px-3 py-1.5 text-sm ${
                  w.found
                    ? "border-accent/30 bg-accent/5 text-foreground"
                    : "border-red-800/30 bg-red-900/10 text-foreground/50"
                }`}
              >
                <span className="text-foreground/50">{w.original}</span>
                <span className="mx-1.5 text-foreground/20">→</span>
                <span className={w.found ? "text-accent" : "text-red-400"}>
                  {w.translated}
                </span>
                {!w.found && <span className="ml-1 text-xs text-red-400/60">(inconnu)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide rapide */}
      <div className="mt-12 rounded-lg border border-accent-dim/15 bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent/70">
          Guide rapide du Mando&apos;a
        </h3>
        <div className="grid gap-4 text-sm text-foreground/60 md:grid-cols-2">
          <div>
            <p className="mb-1 font-medium text-foreground/80">Salutations</p>
            <p><span className="text-accent">Su cuy&apos;gar</span> — Bonjour (tu es encore en vie)</p>
            <p><span className="text-accent">Ret&apos;urcye mhi</span> — Au revoir</p>
            <p><span className="text-accent">Vor&apos;e</span> — Merci</p>
            <p><span className="text-accent">Oya !</span> — Allons-y !</p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground/80">Expressions</p>
            <p><span className="text-accent">Aliit ori&apos;shya tal&apos;din</span> — Le clan est plus que le sang</p>
            <p><span className="text-accent">Oya manda</span> — Solidarité mandalorienne</p>
            <p><span className="text-accent">Kandosii !</span> — Bien joué !</p>
            <p><span className="text-accent">K&apos;oyacyi !</span> — Bravo ! (Vis !)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
