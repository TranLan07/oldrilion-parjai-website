"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Section = { id: string; order: number; title: string; description: string };

export default function ReglesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clan/${slug}/rules`).then(r => r.json()).then(d => { setSections(d); setLoading(false); });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="mb-12 text-4xl font-bold tracking-widest text-accent">RÈGLES</h1>

      {loading && <p className="text-foreground/50">Chargement...</p>}

      {!loading && sections.length === 0 && (
        <p className="py-12 text-center text-foreground/40">
          Les règles du clan seront bientôt publiées...
        </p>
      )}

      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={s.id} className="flex gap-6 rounded-lg border border-accent-dim/20 bg-surface p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
              {i + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-accent/90">{s.title}</h3>
              <p className="mt-1 whitespace-pre-line text-foreground/60">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
