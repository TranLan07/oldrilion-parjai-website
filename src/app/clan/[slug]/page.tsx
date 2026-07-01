"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Spec = { id: string; name: string; description: string; secret: boolean; order: number };

export default function Home() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [openSpec, setOpenSpec] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clan/${slug}/specializations`).then(r => r.json()).then(setSpecs).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="relative flex min-h-[85vh] w-full flex-col items-center justify-center px-6 text-center"
        style={{ background: "var(--grad-void)" }}>
        {/* Texture overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "var(--texture-weave)" }} />

        {session?.user?.name && (
          <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full"
            style={{ background: "var(--grad-blood)", boxShadow: "var(--glow-red)" }}>
            <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--beskar-100)" }}>
              {session.user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
        )}

        <h1 className="relative" style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(4rem, 11vw, 9rem)",
          fontWeight: 700,
          letterSpacing: "0.18em",
          lineHeight: 1.05,
          color: "#f2f2f5",
        }}>PARJAI</h1>

        <p className="relative mt-2 text-lg uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--gold-500)", fontWeight: 300 }}>
          Les Exécuteurs Rouges
        </p>

        <p className="relative mt-4 max-w-lg text-base" style={{ color: "var(--beskar-200)" }}>
          Victoire en Mando&apos;a — Un clan forgé dans le beskar, guidé par l&apos;honneur et le sang.
        </p>

        {/* Decorative gold edge */}
        <div className="relative mt-8 mb-10 h-px w-48" style={{ background: "var(--grad-edge)" }} />

        <div className="relative flex gap-4">
          {!session && (
            <a href="/recrutement"
              className="rounded-sm px-8 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all"
              style={{
                fontFamily: "var(--font-display)",
                background: "var(--red-600)",
                color: "#fbeaea",
                boxShadow: "var(--glow-red)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-500)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--red-600)"; }}
            >Rejoindre le clan</a>
          )}
          <a href="/lore"
            className="rounded-sm border px-8 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-all"
            style={{
              fontFamily: "var(--font-display)",
              borderColor: "var(--beskar-500)",
              color: "var(--beskar-200)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.color = "var(--gold-500)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--beskar-500)"; e.currentTarget.style.color = "var(--beskar-200)"; }}
          >Notre histoire</a>
        </div>
      </section>

      {/* Values */}
      <section className="w-full py-24" style={{ background: "var(--beskar-900)" }}>
        <div className="mx-auto grid max-w-[1200px] gap-6 px-6 md:grid-cols-3">
          {[
            {
              title: "Honneur",
              desc: "Le Resol'nare guide chacun de nos pas. Nous vivons selon le code mandalorien.",
              accent: "var(--gold-500)",
            },
            {
              title: "Fraternité",
              desc: "Aliit ori'shya tal'din — Le clan est plus que le sang. Chaque membre est famille.",
              accent: "var(--red-600)",
            },
            {
              title: "Combat",
              desc: "Forgés dans la bataille, nous défendons les nôtres avec la ténacité du beskar.",
              accent: "var(--gold-500)",
            },
          ].map(({ title, desc, accent }) => (
            <div key={title} className="relative overflow-hidden rounded-sm p-8"
              style={{
                background: "var(--beskar-800)",
                border: "1px solid var(--beskar-600)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}>
              {/* Top accent line */}
              <div className="absolute top-0 left-0 h-0.5 w-full" style={{ background: accent }} />
              <h3 className="mb-3 text-lg font-bold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", color: accent }}>
                {title}
              </h3>
              <p style={{ color: "var(--beskar-200)", fontSize: "0.9375rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Specializations */}
      {specs.length > 0 && (
        <section className="w-full py-24 px-6" style={{ background: "var(--black)" }}>
          <div className="mx-auto max-w-[1200px]">
            <h2 className="mb-2 text-center text-3xl font-bold uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
              Spécialisations
            </h2>
            <div className="mx-auto mb-12 h-px w-24" style={{ background: "var(--grad-edge)" }} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {specs.map((spec) => {
                const isSecret = spec.secret;
                const color = isSecret ? "#a259e0" : "var(--gold-500)";
                const isOpen = openSpec === spec.id;

                return (
                  <div key={spec.id}
                    className="cursor-pointer rounded-sm p-6 text-center transition-all"
                    style={{
                      background: isOpen ? "var(--beskar-700)" : "var(--beskar-800)",
                      border: `1px solid ${isOpen ? color : "var(--beskar-600)"}`,
                      boxShadow: isOpen ? (isSecret
                        ? "0 0 0 1px rgba(162,89,224,0.4), 0 0 24px -4px rgba(107,33,168,0.55)"
                        : "var(--glow-gold)") : "none",
                    }}
                    onClick={() => setOpenSpec(isOpen ? null : spec.id)}
                  >
                    <span className="text-2xl font-bold uppercase tracking-[0.14em]"
                      style={{ fontFamily: "var(--font-display)", color }}>
                      {spec.name}
                    </span>

                    {/* Description — shown on click, hidden if secret */}
                    {isOpen && (
                      <div className="mt-4 text-left">
                        {isSecret ? (
                          <p className="text-sm italic" style={{ color: "#a259e0" }}>
                            — Informations classifiées —
                          </p>
                        ) : spec.description ? (
                          <p className="text-sm leading-relaxed" style={{ color: "var(--beskar-200)" }}>
                            {spec.description}
                          </p>
                        ) : (
                          <p className="text-sm italic" style={{ color: "var(--beskar-400)" }}>
                            Aucune description disponible.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
