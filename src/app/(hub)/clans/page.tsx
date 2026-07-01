import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Clans — Le Hub" };

export default async function ClansPage() {
  const clans = await prisma.clan.findMany({
    include: {
      tags: { include: { tag: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16">
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
        Clans
      </h1>
      <p className="mb-10 text-sm" style={{ color: "#6b7280" }}>
        {clans.length} clan{clans.length > 1 ? "s" : ""} enregistré{clans.length > 1 ? "s" : ""} sur le hub.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {clans.map(clan => (
          <div key={clan.id} className="rounded-sm border overflow-hidden"
            style={{ borderColor: "#2a2a2a", background: "#0d0d0d" }}>
            {/* Header coloré */}
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${clan.colorAccent}, ${clan.colorPrimary})` }} />
            <div className="p-6">
              <h2 className="mb-1 text-xl font-bold uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-display)", color: clan.colorPrimary }}>
                {clan.name}
              </h2>
              <p className="mb-3 text-xs" style={{ color: "#6b7280" }}>
                {clan._count.members} membre{clan._count.members > 1 ? "s" : ""}
              </p>
              <p className="mb-4 text-sm" style={{ color: "#9ca3af" }}>
                {clan.description || "Aucune description."}
              </p>

              {clan.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {clan.tags.map(ct => (
                    <span key={ct.tagId}
                      className="rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em]"
                      style={{ background: "#1a1a1a", color: "#6b7280", border: "1px solid #2a2a2a" }}>
                      {ct.tag.name}
                    </span>
                  ))}
                </div>
              )}

              <Link href={`/clan/${clan.slug}`}
                className="inline-block rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
                style={{ borderColor: clan.colorPrimary, color: clan.colorPrimary }}
              >
                Visiter →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
