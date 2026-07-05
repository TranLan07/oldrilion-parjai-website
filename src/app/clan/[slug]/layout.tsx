import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClanNavbar from "@/components/ClanNavbar";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({ where: { slug } });
  if (!clan) return { title: "Clan introuvable" };
  return { title: `${clan.name} — Hub Mandalorien` };
}

export default async function ClanLayout({ children, params }: Props) {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({
    where: { slug },
    include: { pagePerms: { where: { path: "diplomatie" }, select: { minPermission: true } } },
  });
  if (!clan) notFound();
  const diplomacyPublic = !clan.pagePerms[0] || clan.pagePerms[0].minPermission <= 1;

  // Personnalisation premium : couleur de texte et couleur de surface (fond du
  // header, du footer et des cartes). Pour les clans premium on remappe aussi les
  // surfaces beskar utilisées par les pages, afin d'unifier le fond des cartes.
  // Les clans non-premium retombent sur les valeurs par défaut du thème.
  const textVar = clan.premium ? `--clan-text: ${clan.colorText};` : "";
  const surfaceVars = clan.premium
    ? `
      --clan-card: ${clan.colorCard};
      --beskar-900: ${clan.colorCard};
      --beskar-800: ${clan.colorCard};
    `
    : "";
  const themeVars = `
    :root {
      --clan-bg: ${clan.colorBg};
      --clan-primary: ${clan.colorPrimary};
      --clan-accent: ${clan.colorAccent};
      --accent: ${clan.colorPrimary};
      --accent-dim: ${clan.colorAccent};
      ${textVar}
      ${surfaceVars}
    }
  `;

  if (clan.suspended) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
        <ClanNavbar slug={clan.slug} clanName={clan.name} />
        <main className="flex flex-1 items-center justify-center px-6 py-24">
          <div className="max-w-md text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h1 className="mb-3 text-2xl font-bold uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>
              Clan suspendu
            </h1>
            <p className="mb-2 text-sm" style={{ color: "#6b7280" }}>
              L&apos;accès à l&apos;espace du clan <strong style={{ color: "#f2f2f5" }}>{clan.name}</strong> est temporairement suspendu par les administrateurs du Hub.
            </p>
            {clan.suspendedReason && (
              <p className="mt-4 rounded-sm border px-4 py-3 text-sm italic"
                style={{ borderColor: "rgba(192,57,43,0.2)", background: "rgba(192,57,43,0.05)", color: "#9ca3af" }}>
                Motif : {clan.suspendedReason}
              </p>
            )}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      <ClanNavbar slug={clan.slug} clanName={clan.name} diplomacyPublic={diplomacyPublic} premium={clan.premium} />
      <main className="flex-1" style={{ background: "var(--clan-bg)", color: "var(--clan-text, inherit)" }}>{children}</main>
      <Footer />
    </>
  );
}
