import Link from "next/link";

export const metadata = { title: "Mentions légales — Le Hub" };

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Mentions légales</h1>
      <p className="mb-10 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
        Obligatoires pour tout site publié en France (loi n°2004-575 du 21 juin 2004, dite LCEN, art. 6-III).
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>1. Éditeur du site</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le site parjai.fr est édité, à titre non professionnel et sans but lucratif, par le responsable du site,
          personne physique domiciliée en France, joignable à l&apos;adresse&nbsp;: <strong style={{ color: "#f2f2f5" }}>gestion@parjai.fr</strong>.
        </p>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le directeur de la publication est le responsable du site, en la même qualité, joignable à la même adresse.
        </p>
        <p className="text-xs leading-relaxed border-l-2 pl-3" style={{ color: "#6b7280", borderColor: "#2a2a2a" }}>
          <strong style={{ color: "#9ca3af" }}>Important&nbsp;:</strong> la loi impose que l&apos;éditeur d&apos;un site soit une personne identifiable. Le nom de domaine et l&apos;adresse email ci-dessus servent d&apos;identifiant public, mais l&apos;identité civile complète (nom, prénom, adresse postale) de la personne physique responsable reste tenue à disposition — de l&apos;hébergeur, d&apos;une autorité judiciaire, ou en cas de litige — même si elle n&apos;est pas affichée publiquement sur le site.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>2. Hébergement</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le site est hébergé par OVH SAS — 2 rue Kellermann, 59100 Roubaix, France
          (<a href="https://www.ovhcloud.com" target="_blank" rel="noopener" style={{ color: "#c9a84c" }}>ovhcloud.com</a>).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>3. Propriété intellectuelle</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le code source, les textes originaux, les visuels et l&apos;identité graphique propres à Parjai sont la propriété de leur auteur et ne peuvent être reproduits sans autorisation.
        </p>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Parjai est un site de fans (<em>fan-made</em>), non officiel et sans lien avec Lucasfilm Ltd., The Walt Disney Company ou leurs filiales. Les éléments de l&apos;univers Star Wars évoqués dans un cadre de jeu de rôle (noms, concepts, terminologie) restent la propriété de leurs ayants droit respectifs et sont utilisés ici à titre non commercial, dans le cadre d&apos;un hommage communautaire.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le présent site n&apos;entretient par ailleurs aucun lien direct avec Oldrilion, le serveur de jeu de rôle auquel la communauté Parjai se rattache&nbsp;: il s&apos;agit d&apos;un outil indépendant, édité et maintenu séparément. L&apos;éditeur se conformera néanmoins à toute exigence relative au fonctionnement du présent site qui lui serait directement adressée par les responsables d&apos;Oldrilion.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>4. Contact</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Pour toute question, y compris relative aux données personnelles&nbsp;:
          {" "}<Link href="/contact" style={{ color: "#c9a84c" }}>formulaire de contact</Link> du site (catégorie « RGPD »)
          {" "}ou <strong style={{ color: "#f2f2f5" }}>gestion@parjai.fr</strong>.
        </p>
      </section>
    </div>
  );
}
