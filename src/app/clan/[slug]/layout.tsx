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
  const clan = await prisma.clan.findUnique({ where: { slug } });
  if (!clan) notFound();

  const themeVars = `
    :root {
      --clan-bg: ${clan.colorBg};
      --clan-primary: ${clan.colorPrimary};
      --clan-accent: ${clan.colorAccent};
      --accent: ${clan.colorPrimary};
      --accent-dim: ${clan.colorAccent};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      <ClanNavbar slug={clan.slug} clanName={clan.name} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
