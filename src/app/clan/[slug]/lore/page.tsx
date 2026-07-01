"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Section = { id: string; order: number; title: string; description: string };

export default function LorePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clan/${slug}/lore`).then(r => r.json()).then(d => { setSections(d); setLoading(false); });
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="mb-12 text-4xl font-bold tracking-widest text-accent">LORE</h1>

      {loading && <p className="text-foreground/50">Chargement...</p>}

      {!loading && sections.length === 0 && (
        <p className="py-12 text-center text-foreground/40">
          Le lore du clan Parjai sera bientôt disponible...
        </p>
      )}

      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.id}>
            <h2 className="mb-4 text-2xl font-semibold text-accent/80">{s.title}</h2>
            <div className="whitespace-pre-line leading-relaxed text-foreground/80">
              {s.description}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
