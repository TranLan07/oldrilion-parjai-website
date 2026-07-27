import Link from "next/link";

export const metadata = { title: "Politique de confidentialité — Le Hub" };

const sections = [
  { id: "responsable", title: "1. Responsable du traitement" },
  { id: "donnees", title: "2. Données collectées" },
  { id: "finalites", title: "3. Finalités et base légale" },
  { id: "destinataires", title: "4. Destinataires des données" },
  { id: "cookies", title: "5. Cookies" },
  { id: "conservation", title: "6. Durée de conservation" },
  { id: "droits", title: "7. Vos droits" },
  { id: "securite", title: "8. Sécurité" },
  { id: "mineurs", title: "9. Mineurs" },
];

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "#4a4a4a" }}>Hub</p>
      <h1 className="mb-2 text-4xl font-bold uppercase tracking-[0.14em]"
        style={{ fontFamily: "var(--font-display)", color: "#f2f2f5" }}>Politique de confidentialité</h1>
      <p className="mb-10 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
        Conforme au Règlement Général sur la Protection des Données (RGPD) · Version 1.0
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

      <section id="responsable" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>1. Responsable du traitement</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le responsable du site parjai.fr, éditeur du Site à titre non professionnel, est responsable du traitement des données décrit ci-dessous. Contact&nbsp;:
          {" "}<Link href="/contact" style={{ color: "#c9a84c" }}>formulaire de contact</Link> (catégorie « RGPD »)
          {" "}ou <strong style={{ color: "#f2f2f5" }}>gestion@parjai.fr</strong>.
        </p>
      </section>

      <section id="donnees" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>2. Données collectées</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>Le Site collecte le minimum de données nécessaire à son fonctionnement&nbsp;:</p>
        <ul className="ml-4 list-disc space-y-1.5 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          <li><strong style={{ color: "#f2f2f5" }}>À l&apos;inscription</strong> — identifiant de connexion et mot de passe (stocké sous forme hachée, jamais en clair), nom affiché. Aucune adresse email n&apos;est requise pour créer un compte.</li>
          <li><strong style={{ color: "#f2f2f5" }}>De façon facultative</strong> — biographie, « discours » de profil, choix de visibilité, spécialisation de couverture, et une adresse email uniquement si l&apos;utilisateur active un suivi de canal par email ou utilise le formulaire de contact.</li>
          <li><strong style={{ color: "#f2f2f5" }}>Techniques</strong> — un cookie de session strictement nécessaire à la connexion (aucun cookie publicitaire ou de traçage tiers), et les journaux techniques standards de l&apos;hébergeur (ex. adresse IP), conservés pour la sécurité du service.</li>
        </ul>
      </section>

      <section id="finalites" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>3. Finalités et base légale</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les données sont utilisées pour&nbsp;: la création et la gestion du compte, l&apos;authentification, le fonctionnement des fonctionnalités communautaires (messagerie, clans, notifications), la modération et la sécurité du Site. Le traitement repose sur l&apos;exécution des présentes CGU acceptées par l&apos;utilisateur et, pour la modération, sur l&apos;intérêt légitime de l&apos;éditeur à assurer un usage sain du Site.
        </p>
      </section>

      <section id="destinataires" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>4. Destinataires des données</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les données sont accessibles aux administrateurs du Site et, selon leur rôle, aux administrateurs du clan auquel appartient l&apos;utilisateur. Elles ne sont ni vendues, ni cédées, ni utilisées à des fins publicitaires. L&apos;hébergeur (OVH) y a accès techniquement dans le cadre de l&apos;hébergement.
        </p>
      </section>

      <section id="cookies" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>5. Cookies</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site utilise uniquement un cookie de session, strictement nécessaire pour maintenir la connexion de l&apos;utilisateur. Ce cookie ne sert à aucun suivi publicitaire et n&apos;est partagé avec aucun tiers.
        </p>
      </section>

      <section id="conservation" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>6. Durée de conservation</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les données sont conservées tant que le compte existe. En cas de suppression du compte, les données personnelles sont supprimées, sous réserve des informations dont la conservation serait requise par la loi.
        </p>
      </section>

      <section id="droits" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>7. Vos droits</h2>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Conformément au RGPD, chaque utilisateur dispose d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation et d&apos;opposition concernant ses données, ainsi que d&apos;un droit à la portabilité. Ces droits s&apos;exercent via le
          {" "}<Link href="/contact" style={{ color: "#c9a84c" }}>formulaire de contact</Link> du Site (catégorie « RGPD »)
          {" "}ou à <strong style={{ color: "#f2f2f5" }}>gestion@parjai.fr</strong>. Une réponse est apportée dans un délai raisonnable, et au plus tard dans le délai légal d&apos;un mois.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          L&apos;utilisateur dispose également du droit d&apos;introduire une réclamation auprès de la CNIL
          {" "}(<a href="https://www.cnil.fr" target="_blank" rel="noopener" style={{ color: "#c9a84c" }}>cnil.fr</a>).
        </p>
      </section>

      <section id="securite" className="mb-8 scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>8. Sécurité</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Les mots de passe sont stockés sous forme hachée (bcrypt) et ne sont jamais accessibles en clair, y compris par l&apos;éditeur. Des mesures raisonnables sont mises en œuvre pour protéger les données contre l&apos;accès non autorisé, la perte ou l&apos;altération.
        </p>
      </section>

      <section id="mineurs" className="scroll-mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#c9a84c" }}>9. Mineurs</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          Le Site n&apos;est pas destiné aux personnes de moins de 15 ans (voir <Link href="/cgu" style={{ color: "#c9a84c" }}>CGU, art. 2</Link>). Aucune vérification technique de l&apos;âge n&apos;étant réalisée, les parents ou tuteurs légaux sont invités à superviser l&apos;usage d&apos;internet par les mineurs dont ils ont la charge.
        </p>
      </section>
    </div>
  );
}
