export const metadata = { title: "Conditions générales d'utilisation — Le Hub" };

const sections = [
  { id: "objet", title: "1. Objet" },
  { id: "acces", title: "2. Accès au service et âge minimum" },
  { id: "compte", title: "3. Compte utilisateur" },
  { id: "charte", title: "4. Charte de conduite" },
  { id: "contenu", title: "5. Contenu publié par les utilisateurs" },
  { id: "economie", title: "6. Économie et biens fictifs" },
  { id: "moderation", title: "7. Modération et sanctions" },
  { id: "disponibilite", title: "8. Disponibilité du service" },
  { id: "responsabilite", title: "9. Limitation de responsabilité" },
  { id: "resiliation", title: "10. Résiliation" },
  { id: "modification", title: "11. Modification des CGU" },
  { id: "droit", title: "12. Droit applicable" },
];

export default function CguPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Conditions générales d&apos;utilisation</h1>
      <p className="mb-10 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
        Dernière mise à jour&nbsp;: 27 juillet 2026 · Version 1.0
      </p>

      <nav className="mb-10 rounded-sm border p-4" style={{ borderColor: "#1a1a1a", background: "#0d0d0d" }}>
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {sections.map(s => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-xs" style={{ color: "#6b7280" }}>{s.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="objet" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>1. Objet</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les présentes conditions générales d&apos;utilisation (CGU) régissent l&apos;accès et l&apos;utilisation du site Parjai (« le Site »), plateforme communautaire gratuite dédiée à un serveur de jeu de rôle (RP) Star Wars à thème mandalorien. Le Site permet notamment&nbsp;: consultation de contenu RP, création de compte, adhésion à un « clan » (faction), messagerie entre membres, participation à des missions et événements fictifs, et gestion d&apos;une économie interne fictive.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          En créant un compte ou en utilisant le Site, l&apos;utilisateur accepte sans réserve les présentes CGU.
        </p>
      </section>

      <section id="acces" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>2. Accès au service et âge minimum</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          L&apos;accès au Site et son utilisation de base sont gratuits. La création d&apos;un compte est nécessaire pour accéder aux fonctionnalités communautaires (messagerie, clans, missions, etc.).
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site est destiné aux personnes âgées de <strong style={{ color: "#f2f2f5" }}>15 ans ou plus</strong>. En créant un compte, l&apos;utilisateur déclare avoir atteint cet âge. <strong style={{ color: "#f2f2f5" }}>Aucune vérification technique de l&apos;âge n&apos;est réalisée</strong>&nbsp;; l&apos;éditeur se réserve le droit de suspendre ou supprimer tout compte pour lequel il aurait connaissance d&apos;un manquement à cette condition.
        </p>
      </section>

      <section id="compte" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>3. Compte utilisateur</h2>
        <ul className="ml-4 list-disc space-y-1.5 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          <li>Chaque utilisateur est responsable de la confidentialité de son mot de passe et de toute activité effectuée depuis son compte.</li>
          <li>Un compte est destiné à un usage personnel&nbsp;; la création de comptes multiples dans un but de nuisance (contournement d&apos;une sanction, spam) est interdite.</li>
          <li>Certains comptes sont créés directement par un administrateur (recrutement accepté, ou création manuelle) avec un mot de passe temporaire&nbsp;: l&apos;utilisateur doit le modifier dès sa première connexion.</li>
          <li>L&apos;utilisateur peut supprimer son compte ou quitter son clan à tout moment depuis son profil.</li>
        </ul>
      </section>

      <section id="charte" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>4. Charte de conduite</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>En utilisant le Site, l&apos;utilisateur s&apos;engage à&nbsp;:</p>
        <ul className="mb-3 ml-4 list-disc space-y-1.5 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          <li>Respecter les autres membres et faire preuve de courtoisie, y compris dans les échanges en roleplay ;</li>
          <li>Ne publier aucun contenu illicite, haineux, discriminatoire, pornographique ou faisant l&apos;apologie de la violence réelle — le cadre fictif du jeu de rôle ne dispense d&apos;aucune obligation légale ;</li>
          <li>Ne pas usurper l&apos;identité d&apos;un tiers ni harceler d&apos;autres utilisateurs ;</li>
          <li>Ne pas tenter de contourner les mesures de sécurité, d&apos;automatiser des actions, ou d&apos;accéder à des données ne lui appartenant pas.</li>
        </ul>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site intègre un système de signalement permettant à tout utilisateur de porter un contenu ou un comportement à l&apos;attention des administrateurs.
        </p>
      </section>

      <section id="contenu" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>5. Contenu publié par les utilisateurs</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          L&apos;utilisateur reste titulaire des droits sur les contenus qu&apos;il publie (textes de roleplay, présentations, messages). En les publiant sur le Site, il concède à l&apos;éditeur une licence non exclusive, gratuite et limitée à la durée de conservation du contenu, permettant son stockage, son affichage et sa diffusion aux autres utilisateurs dans le cadre normal de fonctionnement du Site.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          L&apos;éditeur peut retirer ou modérer tout contenu contraire à la charte de conduite ou à la loi, sans préavis.
        </p>
      </section>

      <section id="economie" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>6. Économie et biens fictifs</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site propose des mécaniques internes purement fictives à des fins de jeu de rôle&nbsp;: monnaie de « banque de clan », annonces de « marketplace », grades, statuts. <strong style={{ color: "#f2f2f5" }}>Ces éléments n&apos;ont aucune valeur monétaire réelle</strong>, ne peuvent être achetés, vendus ou échangés contre de l&apos;argent réel ou tout autre bien de valeur, et l&apos;éditeur n&apos;offre aucune garantie quant à leur conservation, leur équilibrage ou leur disponibilité future.
        </p>
      </section>

      <section id="moderation" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>7. Modération et sanctions</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          En cas de manquement aux présentes CGU, l&apos;éditeur ou les administrateurs habilités (du Site ou d&apos;un clan) peuvent, selon la gravité et sans préavis&nbsp;: mettre en sourdine (« mute ») un utilisateur sur un canal, restreindre un accès, suspendre un compte ou un clan entier, ou supprimer définitivement un compte.
        </p>
      </section>

      <section id="disponibilite" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>8. Disponibilité du service</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site est un projet communautaire géré bénévolement. L&apos;éditeur s&apos;efforce d&apos;assurer un accès continu mais ne garantit ni disponibilité permanente, ni absence d&apos;erreurs, ni conservation illimitée des données. Le Site peut être interrompu, modifié ou arrêté à tout moment, notamment pour maintenance.
        </p>
      </section>

      <section id="responsabilite" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>9. Limitation de responsabilité</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site est fourni « en l&apos;état ». L&apos;éditeur ne saurait être tenu responsable des contenus publiés par les utilisateurs, des interruptions de service, ni d&apos;un dommage indirect résultant de l&apos;utilisation du Site. Chaque utilisateur demeure seul responsable des contenus qu&apos;il publie et des conséquences de ses actes sur le Site.
        </p>
      </section>

      <section id="resiliation" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>10. Résiliation</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          L&apos;utilisateur peut cesser d&apos;utiliser le Site et demander la suppression de son compte à tout moment. L&apos;éditeur peut résilier l&apos;accès d&apos;un utilisateur en cas de violation des présentes CGU.
        </p>
      </section>

      <section id="modification" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>11. Modification des CGU</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les présentes CGU peuvent être modifiées à tout moment. La version en vigueur est celle publiée sur le Site à la date de connexion de l&apos;utilisateur. Toute modification substantielle sera signalée sur le Site.
        </p>
      </section>

      <section id="droit" className="scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>12. Droit applicable</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les présentes CGU sont soumises au droit français. Tout litige relève, à défaut de résolution amiable, des tribunaux français compétents.
        </p>
      </section>
    </div>
  );
}
