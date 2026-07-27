# Parjai Web

Hub multi-clans Next.js pour le réseau **Parjai** — serveur de roleplay Star Wars (Oldrilion), à thème mandalorien.

---

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Structure du projet](#structure-du-projet)
4. [Schéma de données](#schéma-de-données)
5. [Authentification & permissions](#authentification--permissions)
6. [Fonctionnalités](#fonctionnalités)
7. [Installation et développement](#installation-et-développement)
8. [Déploiement VPS](#déploiement-vps)
9. [Variables d'environnement](#variables-denvironnement)
10. [Historique des versions](#historique-des-versions)

---

## Vue d'ensemble

**Parjai Web** est une plateforme multi-clans destinée aux membres d'un réseau mandalorien RP. Elle combine :

- Un **Hub** central (espace inter-clans) : annuaire des clans, missions et événements globaux, messagerie unifiée, marketplace, traducteur Mando'a, profils publics
- Des **espaces clan** indépendants : lore, règles, membres, grades, spécialisations, messagerie interne, banque, diplomatie, recrutement, lien vers un site externe
- Une **messagerie unifiée** (`/messagerie`) à onglets — Tous / Public / Clan / Privé — remplaçant les anciennes pages séparées hub et clan, avec la direction artistique du clan appliquée sur l'onglet Clan
- Un **système freemium** permettant aux clans premium de débloquer des fonctionnalités avancées
- Des **panneaux d'admin** (clan et hub) partageant la même charte de navigation — sidebar par catégories, tableau de bord, et pour le clan un onglet Aide avec tutoriel + canal de support direct vers le hub
- Des **profils publics** (`/user/[code]`) à visibilité configurable bloc par bloc
- Les **pages légales** (mentions légales, CGU, politique de confidentialité) intégrées au site

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.2.9 (App Router) |
| Langage | TypeScript 5 |
| Style | Tailwind CSS v4 |
| Base de données | SQLite (via Prisma 6) |
| ORM | Prisma Client 6 |
| Auth | NextAuth v5 (beta) — JWT sessions |
| Email | Nodemailer |
| Temps réel | Server-Sent Events (SSE) maison |
| NLP | `french-verbs` + `french-verbs-lefff` (lemmatisation) |
| Tests | Vitest (unitaires/intégration) + Playwright (E2E, navigateur réel) |
| Runtime | Node.js (production : PM2 ou équivalent) |

---

## Structure du projet

```
prisma/
  schema.prisma          # Schéma complet de la base de données (31 modèles)
  migrations/             # Migrations historiques (les évolutions récentes passent par `prisma db push`)

src/
  app/
    (hub)/               # Routes du Hub (layout public/auth partagé, Navbar + Footer)
      page.tsx           # Accueil Hub (stats, annuaire des clans)
      clans/             # Annuaire des clans
      marketplace/       # Marketplace inter-clans
      messagerie/        # Messagerie UNIFIÉE — onglets Tous/Public/Clan/Privé (remplace les anciennes pages hub + clan)
      missions/          # Missions hub globales
      evenements/        # Événements hub globaux
      traducteur/        # Traducteur Français ↔ Mando'a (génère des mots crédibles pour les termes inconnus)
      notifications/     # Notifications
      contacts/          # Carnet de contacts + conversations privées (DM)
      profil/            # Profil utilisateur (privé, édition + gestion du profil public)
      parametres/        # Paramètres compte
      contact/           # Formulaire de contact (catégorie RGPD incluse)
      user/[code]/       # Profil PUBLIC d'un utilisateur, visibilité par bloc
      cgu/                # Conditions générales d'utilisation
      mentions-legales/   # Mentions légales
      confidentialite/    # Politique de confidentialité (RGPD)
      hub/admin/         # Panneau admin Hub — sidebar par catégories (Réseau, Utilisateurs, Support, Activité inter-clans, Système) + Vue d'ensemble
      login/
      change-password/

    clan/[slug]/         # Espace d'un clan (layout avec thème custom, ClanNavbar)
      page.tsx           # Accueil clan (+ bouton "Site du clan" si un lien externe est configuré)
      lore/              # Lore du clan
      regles/             # Règles du clan
      membres/            # Annuaire des membres (noms cliquables → profil public)
      missions/           # Missions du clan
      evenements/         # Événements du clan
      messagerie/         # Redirige vers /messagerie?tab=clan (ancienne page conservée pour ne pas casser les favoris)
      banque/             # Banque du clan (dépôts/retraits)
      diplomatie/         # Relations diplomatiques
      recrutement/        # Formulaire de candidature (+ champs personnalisés premium)
      profil/             # Vue "profil" scope clan (réutilise ProfileView)
      marketplace/        # Marketplace du clan (premium)
      admin/              # Panneau admin clan — sidebar (Membres, Contenu, Activité, Apparence & réglages) + Tableau de bord + Aide

    api/
      auth/[...nextauth]/  # NextAuth (Credentials + JWT)
      auth/change-password/
      clan/[slug]/         # API clan (publique + admin)
        public/            # Infos publiques du clan (dont websiteUrl)
        values/            # Valeurs personnalisées affichées sur l'accueil
        banque/            # Banque
        diplomatie/        # Diplomatie (lecture publique)
        channels/          # Canaux + SSE + messages + membres + follow + settings
        missions/, evenements/, specializations/, lore/, rules/, members/, recruitment/, roster-config/
        admin/             # Routes admin : grades, specs, canaux, missions, evenements, lore, rules, users
                           #  (dont création directe d'un accès membre), whitelist, settings, tags, pages,
                           #  diplomatie(+tag), recruitment, recruitment-fields, values, help-request
      hub/
        channels/          # Canaux hub + SSE + messages (publics, diplomatiques, DM)
        missions/, events/, marketplace/, clans/
        notifications/sse/
        admin/             # Admin Hub : users, clans(+webmaster), missions, events, dictionary, tags, config, clan-requests
      user/[code]/          # Profil public (résolution par identifiant public, visibilité par bloc)
      dm/                   # Ouverture/liste des conversations privées
      contacts/, contact/   # Carnet de contacts / formulaire de contact public
      notifications/, translate/, profil/(+settings,+leave-clan,+channel-notifs), tags/, channels/(follow,confirm)

  components/
    Navbar.tsx           # Navigation Hub (dropdown App, SSE notifs)
    ClanNavbar.tsx       # Navigation clan (liens dynamiques selon perms, Messages → /messagerie?tab=clan&clan=[slug])
    Footer.tsx           # Partagé sur tout le site — liens Mentions légales / CGU / Confidentialité
    ProfileView.tsx      # Profil privé (édition) — réutilisé par /profil et /clan/[slug]/profil
    DebugContext.tsx / DebugPanel.tsx  # Simulation d'identité (clan/grade/spé/permission) pour QA sans multiplier les comptes
    Providers.tsx        # SessionProvider NextAuth

  lib/
    auth.ts              # Config NextAuth, JWT callback (refresh DB à chaque requête)
    prisma.ts            # Singleton Prisma Client
    clan-auth.ts         # requireClanAdmin() [bypass hub admin inclus], resolveClan(), suspendedResponse(), notFound(), denied()
    hub-auth.ts          # requireHubAdmin() [admin|moderator], requireHubSuperAdmin() [admin strict], hubDenied()
    admin-check.ts       # requireAdmin() global
    sse-store.ts         # Store SSE en mémoire (messages canaux + compteur notifications)
    translator.ts        # Moteur de traduction FR ↔ Mando'a (lemmatisation, élisions, détection de sens)
    mandoa-auto.ts        # Génération de mots crédibles + persistance DB (utilisé par les canaux ET le traducteur classique)
    dictionary.ts / dictionary-extended.ts  # Dictionnaire de base FR → Mando'a
    french-lemmatizer.ts # Lemmatiseur français (7800+ formes verbales)
    notify-followers.ts  # Envoi d'emails aux abonnés d'un canal
    mail.ts              # Wrapper Nodemailer
    public-id.ts         # Génération des identifiants publics utilisateurs (6 lettres)
    clan-values.ts        # Valeurs par défaut d'un clan + limite (6 max)
    dm.ts                  # Résolution/création d'un canal de messagerie privée entre deux utilisateurs
```

---

## Schéma de données

### Modèles principaux (31 au total)

| Modèle | Description |
|--------|-------------|
| `Clan` | Clan avec thème (colorBg/Primary/Accent/Text/Card), freemium, suspension, banque, `profilesPublic`, `websiteUrl` |
| `User` | Utilisateur : appartenance clan, grade, spéc, permission, anonymat, et profil public (`discours`, `bio`, visibilité par bloc, choix couverture/réelle) |
| `Grade` | Grade scoped à un clan (order, defaultPermission) |
| `Specialization` | Spécialisation scoped à un clan (secret, color premium) |
| `Channel` | Canal de messagerie (clan ou hub ; public, diplomatique ou privé par utilisateurs — DM) |
| `Message` | Message avec support Mando'a (mandoa, originalContent) |
| `Mission` / `Event` | Mission / événement (clan ou hub, visibilité interne/globale/privée) |
| `PagePermission` | Permission par page/action au sein d'un clan (path + minPermission) |
| `LoreSection` / `RuleSection` | Sections de contenu narratif du clan |
| `ClanValue` | Valeurs mises en avant sur l'accueil du clan (3 par défaut, jusqu'à 6 en premium) |
| `Recruitment` / `RecruitmentField` | Candidature de recrutement + champs personnalisés (premium, max 10) |
| `Notification` | Notification in-app utilisateur |
| `DictionaryEntry` | Entrée FR ↔ Mando'a (`isAuto` pour les entrées générées automatiquement) |
| `MarketplaceListing` | Annonce marketplace (joueur ou clan premium) |
| `ClanBankTransaction` | Transaction bancaire journalisée |
| `DiplomacyEntry` / `DiplomacyTag` | Relations diplomatiques d'un clan + tags premium |
| `Contact` | Carnet de contacts entre deux utilisateurs (distinct des canaux DM) |
| `ClanWhitelist` | Liste blanche d'accès à un clan |
| `Report` | Signalement |
| `ClanAdminRequest` | Demande d'un admin de clan vers les admins du hub (question, premium, signalement, autre) |
| `HubConfig` | Configuration Hub clé/valeur |
| `ContactMessage` | Formulaire de contact Hub (RGPD, bug, recrutement, autre) |

### Niveaux de permission

| Valeur | Rôle |
|--------|------|
| 0 | Non connecté / hors clan |
| 1 | Membre standard |
| 3–9 | Grades intermédiaires (configurables) |
| 10+ | Admin de clan |
| `hubRole = "moderator"` | Modérateur Hub |
| `hubRole = "admin"` | Admin Hub (accès total, y compris bypass des permissions de clan) |

---

## Authentification & permissions

### NextAuth v5 — JWT

Le callback JWT rafraîchit les données utilisateur depuis la DB **à chaque requête** (pas seulement à la connexion), garantissant la cohérence après changement de grade ou d'appartenance clan.

```ts
// src/lib/auth.ts
async jwt({ token, user }) {
  const uid = user?.id ?? token.userId ?? token.sub;
  if (uid) {
    const dbUser = await prisma.user.findUnique({ where: { id: uid }, include: { clan: ... } });
    // Popule token.permissionLevel, token.clanSlug, token.hubRole, token.mandalorien, etc.
  }
  return token;
}
```

### Helpers d'auth (côté API)

- `requireClanAdmin(slug)` — vérifie `permissionLevel >= 10` dans le clan **OU** `hubRole === "admin"` (un admin hub strict peut administrer n'importe quel clan, y compris ses canaux privés — voir §7 de l'historique)
- `resolveClan(slug)` — récupère le clan avec tous les champs nécessaires (premium, suspended…)
- `suspendedResponse()` — retourne 403 si clan suspendu
- `requireHubAdmin()` — vérifie `hubRole === "admin" | "moderator"`
- `requireHubSuperAdmin()` — vérifie `hubRole === "admin"` strictement (actions sensibles : gestion complète des utilisateurs, reset de mot de passe, suppression)
- `PagePermission` — mécanisme générique de permission par page/action (réutilisé pour banque, diplomatie)

### Suspension de clan

Un clan suspendu est filtré de la liste publique et bloque **toutes** ses routes API avec 403. Le layout `clan/[slug]/layout.tsx` affiche un écran de gel à la place du contenu, pour tous les utilisateurs y compris les admins clan.

---

## Fonctionnalités

### Hub
- **Accueil** : présentation du réseau, stats (clans/membres/missions), annuaire des clans actifs
- **Annuaire des clans** : liste filtrée (hors clans suspendus), accès direct
- **Messagerie unifiée** (`/messagerie`) : un seul espace à 4 onglets — **Tous**, **Public** (canaux inter-clans + diplomatiques), **Clan** (canaux du clan de l'utilisateur, DA du clan appliquée), **Privé** (DM). Accessible avec `?tab=clan&clan=[slug]` pour cibler un clan précis (admin hub uniquement pour un clan tiers)
- **Missions / Événements hub** : globaux, ouverts à tous, participation
- **Marketplace** : annonces joueurs (1/semaine) et clans premium (illimitées), contact par canal privé
- **Traducteur Mando'a** (`/traducteur`) : traduction FR ↔ Mando'a avec lemmatisation ; un mot FR inconnu reçoit un mot Mando'a crédible généré et mémorisé, affiché en bleu doux dans le détail mot par mot (doré = dictionnaire, rouge = non reconnu)
- **Profil public** (`/user/[code]`) : discours, biographie, infos de clan — visibilité réglable individuellement (public / clan uniquement / personne), cascade de confidentialité si le clan désactive les profils publics
- **Notifications** : in-app temps réel (SSE), badge dans la Navbar
- **Pages légales** : mentions légales, CGU, politique de confidentialité, liées depuis le pied de page
- **Admin Hub** : sidebar par catégories (Réseau, Utilisateurs, Support, Activité inter-clans, Système) + tableau de bord "Vue d'ensemble" ; gestion utilisateurs, clans (premium/suspension/suppression), missions, événements, dictionnaire, tags, config, et traitement des demandes envoyées par les admins de clan

### Espace clan
- **Accueil** : présentation, thème custom, valeurs personnalisées, bouton "Site du clan" si un lien externe est configuré (ouvre un nouvel onglet)
- **Lore / Règles** : sections éditables
- **Membres** : liste avec grades, spécialisations, niveaux de permission — noms cliquables vers le profil public
- **Missions / Événements** : gestion + participation
- **Messagerie** : redirige vers la messagerie unifiée du Hub, onglet Clan (canaux privés SSE, notifications email, mode Mando'a, DA du clan)
- **Banque** : solde, dépôts/retraits journalisés, permissions configurables
- **Diplomatie** : alliés/ennemis (clans du site ou custom), tags premium
- **Recrutement** : formulaire candidature + champs personnalisés (premium), traitement admin
- **Admin de clan** : panneau à sidebar (Membres, Contenu du site, Activité, Apparence & réglages) + **Tableau de bord** (stats, checklist premiers pas) + **Aide** (tutoriel, FAQ, formulaire de contact direct vers les admins du hub) ; création directe d'un accès membre (grade + spécialisation au choix, mot de passe temporaire) sans passer par le recrutement

### Freemium

Le système freemium bloque à l'écriture et masque à la lecture — les données ne sont jamais supprimées. Réversible instantanément si le flag `premium` change.

| Fonctionnalité | Free | Premium |
|----------------|------|---------|
| Canaux de messagerie | 1 (Général) | Illimité |
| Spécialisations secrètes | ✗ | ✓ |
| Couleur custom spécialisation | ✗ | ✓ |
| Visibility missions/events | internal uniquement | internal + private + global |
| Annonces Marketplace (clan) | ✗ | Illimitées |
| Champs de recrutement personnalisés | ✗ (champs par défaut uniquement) | ✓ (jusqu'à 10) |
| Valeurs d'accueil avec couleur custom | ✗ (couleur accent du clan) | ✓ |
| Historique banque configurable | ✗ (admin seulement) | ✓ (permissions par rôle) |
| Tags diplomatie | ✗ | ✓ |

---

## Installation et développement

### Prérequis

- Node.js 20+
- npm

### Installation

```bash
git clone <repo>
cd parjai-web
npm install
```

### Configuration

Créer `.env` à la racine :

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="votre-secret-aleatoire"
NEXTAUTH_URL="http://localhost:3000"

# Email (optionnel en dev)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="motdepasse"
SMTP_FROM="noreply@example.com"
```

### Initialisation de la base de données

```bash
npx prisma db push
npx prisma generate
```

### Lancer le serveur de développement

```bash
npm run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000).

### Autres commandes

```bash
npm run build    # Build de production
npm run lint     # Linting ESLint
npm test         # Tests unitaires + intégration (Vitest)
npm run test:e2e # Tests end-to-end (Playwright)
npx prisma studio  # Interface graphique DB
```

### Lancer les tests

```bash
# Unitaires + intégration (rapide, aucune dépendance externe)
npm test

# End-to-end (nécessite un serveur de production lancé + un utilisateur de test)
npm run build && npx next start   # dans un terminal
node e2e/seed-e2e.mjs             # une fois : crée e2e_webmaster / e2etest123
npm run test:e2e                  # dans un autre terminal
```

> Playwright nécessite un navigateur téléchargé une fois : `npx playwright install chromium`.

---

## Déploiement VPS

### Première installation

```bash
git clone <repo> /var/www/parjai
cd /var/www/parjai
npm install
cp .env.production .env   # ou créer .env avec les vraies valeurs
npx prisma db push
npx prisma generate
npm run build
pm2 start "npm start" --name parjai
```

### Mise à jour (workflow standard)

```bash
cd /var/www/parjai
git pull
npm install
npx prisma db push --skip-generate   # migre la DB sans écraser le binaire engine en cours
npx prisma generate
npm run build
pm2 restart parjai
```

> **Important** : après une migration de schéma Prisma (ajout de colonnes/modèles), toujours exécuter `npx prisma db push` **sur le VPS** avant de redémarrer l'application.

### Note sur `prisma generate` en développement Windows

Si le serveur de dev est actif, `npx prisma generate` échoue avec `EPERM` car le processus Node tient le fichier `query_engine-windows.dll.node`. Solutions :
1. Arrêter le serveur de dev avant de générer
2. Utiliser `npx prisma generate --no-engine` pour générer uniquement les types TypeScript (suffisant pour la vérification de types, pas pour l'exécution)

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | ✓ | Chemin vers le fichier SQLite (`file:./dev.db`) |
| `NEXTAUTH_SECRET` | ✓ | Secret JWT (min. 32 caractères aléatoires) |
| `NEXTAUTH_URL` | ✓ | URL publique du site (`https://parjai.fr`) |
| `SMTP_HOST` | ✗ | Hôte SMTP pour les emails |
| `SMTP_PORT` | ✗ | Port SMTP (587 ou 465) |
| `SMTP_USER` | ✗ | Identifiant SMTP |
| `SMTP_PASS` | ✗ | Mot de passe SMTP |
| `SMTP_FROM` | ✗ | Adresse expéditeur des emails |

---

## Historique des versions

### V4 — Admin ergonomique, messagerie unifiée, profils publics, pages légales

Refonte majeure faisant suite à la V3.1 : les deux panneaux d'admin (clan et hub) partagent
désormais la même charte de navigation, la messagerie hub et la messagerie de clan ont fusionné
en un seul espace, les utilisateurs disposent d'un profil public à visibilité configurable, et
le site embarque ses propres pages légales.

#### §1 — Admin de clan ergonomique

**Objectif** : rendre le panneau admin de clan (15 onglets à plat) accessible aux admins novices.

- `src/app/clan/[slug]/admin/page.tsx` réorganisé en **sidebar par catégories** (Membres, Contenu du
  site, Activité, Apparence & réglages) au lieu d'une rangée d'onglets qui débordait.
- Lore et Règles fusionnés en un seul écran avec un sélecteur interne (au lieu de 2 onglets).
- Nouvel onglet **Tableau de bord** : stats rapides, badge premium/suspendu, checklist "premiers pas"
  cliquable (grades, spécialisations, lore/règles, canaux).
- Nouvel onglet **Aide** : checklist de configuration, mini-FAQ, et formulaire de contact direct vers
  les admins du hub (voir §3).
- Ajout de repères pour novices : indice de grade équivalent à côté des niveaux de permission
  numériques, messages d'état vide sur les listes qui n'en avaient pas.
- Création directe d'un accès membre (`POST /api/clan/[slug]/admin/users`) : nom, identifiant, grade
  et spécialisation au choix, permission calculée automatiquement, mot de passe temporaire généré et
  affiché une seule fois — sans passer par le formulaire de recrutement.

#### §2 — Admin Hub aligné sur la même charte

`src/app/(hub)/hub/admin/page.tsx` réorganisé en sidebar (Réseau, Utilisateurs, Support, Activité
inter-clans, Système) + nouvel onglet **Vue d'ensemble** (clans, utilisateurs, clans suspendus,
contacts non lus, demandes de clan en attente, événements en attente, avec raccourcis directs).

#### §3 — Demande d'un admin de clan vers le hub

**Schéma** :
```prisma
model ClanAdminRequest {
  id        String   @id @default(cuid())
  clanId    String
  authorId  String
  category  String   // "question" | "premium" | "signalement" | "autre"
  subject   String
  message   String
  status    String   @default("pending") // "pending" | "answered" | "closed"
  createdAt DateTime @default(now())
}
```

- `POST/GET /api/clan/[slug]/admin/help-request` — un admin de clan envoie une demande, avec
  notification in-app (+ email si configuré) pour tous les admins/modérateurs du hub.
- `GET/PUT/DELETE /api/hub/admin/clan-requests` — les admins hub consultent, répondent (statut) et
  suppriment ces demandes, intégrées dans l'onglet Contacts existant de l'admin hub.

#### §4 — Profil public

**Schéma** — nouveaux champs sur `User` :
```prisma
discours            String   @default("")
bio                 String   @default("")
profileVisDiscours  String   @default("public")  // "public" | "clan" | "private"
profileVisBio       String   @default("public")
profileVisClanInfo  String   @default("public")
profileShowRealSpec Boolean  @default(false)
```
… et sur `Clan` : `profilesPublic Boolean @default(true)`.

- Page `src/app/(hub)/user/[code]/page.tsx` + `GET /api/user/[code]` : résolution par identifiant
  public, visibilité indépendante par bloc (discours / bio / infos de clan), bypass pour le
  propriétaire, l'admin du clan concerné et l'admin hub.
- Choix couverture vs vraie spécialisation pour les spécialisations secrètes, basé sur la présence
  d'une couverture publique configurée (pas sur le flag `secret` générique, qui n'était pas utilisé
  de façon cohérente ailleurs sur le site — corrigé après un signalement).
- Cascade de confidentialité : si `Clan.profilesPublic = false`, tous les profils des membres du
  clan deviennent inaccessibles, sauf aux admins.
- Anonymat respecté : nom masqué par l'identifiant public pour les visiteurs, comme sur le reste du
  site. Trombinoscope de clan relié à la nouvelle page (noms cliquables).

#### §5 — Génération de mots dans le traducteur classique

Le moteur de génération déjà utilisé côté canaux de transmission (`mandoa-auto.ts`) est branché sur
le traducteur classique (`/traducteur`, `POST /api/translate`) : en FR→Mando'a, tout mot absent du
dictionnaire reçoit un mot crédible généré et persisté, au lieu d'être laissé tel quel. Chaque mot du
résultat est coloré par origine — doré = dictionnaire, bleu doux = généré, rouge = non reconnu (sens
Mando'a→FR, où rien n'est généré).

**Bug corrigé au passage** : `generateWord()` utilisait des décalages de bits signés (`>>`) sur un
hash pouvant dépasser 2³¹, produisant parfois un mot du type `"dundefinedundefined…"`. Corrigé en
décalages non signés (`>>>`).

#### §6 — Messagerie unifiée

**Objectif** : ne plus avoir deux messageries séparées (hub et clan) mais un seul espace à onglets.

- `src/app/(hub)/messagerie/page.tsx` : onglets **Tous / Public / Clan / Privé**, fusionnant les
  canaux hub (publics + diplomatiques + DM) et les canaux du clan de l'utilisateur.
- L'onglet Clan applique la direction artistique du clan (variables CSS `--clan-primary` etc.
  injectées sur le conteneur, repli sur le doré du hub ailleurs).
- Le lien "Messages" de `ClanNavbar` pointe vers `/messagerie?tab=clan&clan=[slug]` — on atterrit
  directement sur la messagerie du clan concerné.
- Les DM restent des canaux hub à accès restreint par utilisateur (`accessUsers`), distingués
  automatiquement des canaux publics/diplomatiques.
- `src/app/clan/[slug]/messagerie/page.tsx` redirige vers `/messagerie?tab=clan` plutôt que de
  disparaître, pour ne pas casser les favoris existants.
- **Bug corrigé** : `tab` et le clan ciblé étaient d'abord lus depuis `window.location.search` dans
  un `useEffect` au montage — lors d'une navigation *client-side* (clic sur un `<Link>`), rien ne
  garantit que `window.location` reflète déjà la nouvelle URL à cet instant, ce qui pouvait faire
  planter la page (canal actif ne correspondant plus à la liste chargée). Remplacé par
  `useSearchParams()` (réactif, toujours synchronisé), avec dégradation propre si un canal actif
  devient introuvable plutôt qu'une exception.
- **Bug corrigé** : sous ~360px de large, la barre de saisie débordait de l'écran (piège classique
  flexbox — un enfant `flex-1` ne rétrécit pas sous sa taille de contenu sans `min-width: 0`).

#### §7 — Accès admin hub cross-clan

Un admin hub strict (`hubRole === "admin"`, pas les modérateurs) qui clique "Messages" depuis un clan
qui n'est pas le sien accède à la messagerie de *ce* clan, canaux privés compris :

- Bypass ajouté dans `requireClanAdmin()` (déjà existant) et propagé aux routes qui ne l'utilisaient
  pas encore pour les canaux privés : `GET /api/clan/[slug]/channels`,
  `.../channels/[id]/messages` (GET+POST), `.../channels/[id]/sse`.
- **Durcissement au passage** : l'envoi de message sur un canal privé ne vérifiait auparavant aucune
  appartenance (un non-membre pouvait déjà y écrire s'il connaissait l'ID) — aligné sur la lecture.
- Un utilisateur ordinaire ne gagne aucun accès via `?clan=` : l'onglet Clan retombe sur son propre
  clan, ou disparaît s'il n'en a pas.

#### §8 — Lien vers le site personnel du clan

Nouveau champ `Clan.websiteUrl` (Réglages de l'admin de clan), validé et normalisé côté serveur
(schéma `https://` ajouté si absent, URL invalide rejetée). Si renseigné, un bouton "Site du clan"
apparaît sur l'accueil du clan à côté de "Notre histoire" et ouvre le lien dans un nouvel onglet ;
absent sinon.

#### §9 — Pages légales

Trois pages statiques (`/mentions-legales`, `/cgu`, `/confidentialite`), liées depuis le `Footer`
partagé (hub et clans), rédigées à partir des fonctionnalités réelles du site (économie fictive
banque/marketplace sans valeur réelle, absence de vérification technique d'âge, non-affiliation
avec Oldrilion — le serveur RP externe auquel la communauté se rattache).

#### Migrations de base de données V4

```bash
npx prisma db push --skip-generate
```

| Modèle | Colonnes ajoutées |
|--------|-------------------|
| `Clan` | `profilesPublic`, `websiteUrl` |
| `User` | `discours`, `bio`, `profileVisDiscours`, `profileVisBio`, `profileVisClanInfo`, `profileShowRealSpec` |

Nouveaux modèles créés :

| Modèle | Description |
|--------|-------------|
| `ClanValue` | Valeurs personnalisées affichées sur l'accueil du clan |
| `RecruitmentField` | Champs personnalisés du formulaire de recrutement (premium) |
| `ClanAdminRequest` | Demandes des admins de clan vers les admins du hub |

#### Corrections de bugs V4

| Bug | Détecté par | Correction |
|-----|-------------|------------|
| Clans suspendus toujours visibles sur l'accueil hub | signalement utilisateur | Filtre `suspended: false` ajouté à la requête |
| Clans supprimés qui ne disparaissaient jamais de l'accueil hub | signalement utilisateur | `export const dynamic = "force-dynamic"` — la page (Server Component sans `fetch()`) pouvait être pré-rendue statiquement au build |
| Couverture de spécialisation jamais affichée sur le profil public | signalement utilisateur | Condition basée sur `Specialization.secret` (peu utilisé en pratique) remplacée par la simple présence d'une couverture configurée |
| `generateWord()` produisait parfois `"undefined"` dans le mot généré | relecture lors de l'intégration au traducteur classique | Décalages de bits non signés (`>>>`) |
| Crash "Application error" en cliquant Messages depuis un autre clan | signalement utilisateur, reproduit via clic client-side réel (les tests par rechargement complet ne le révélaient pas) | `useSearchParams()` au lieu de `window.location.search` en `useEffect` |
| Barre de saisie de la messagerie débordant sous ~360px | audit responsive | `min-w-0` sur la colonne flex et le champ texte |
| Bandeau de stats (accueil hub) : 3ᵉ compteur qui retombait seul sur une ligne mobile | signalement utilisateur | `flex-nowrap` + espacement/texte responsives |
| Envoi de message possible sur un canal de clan privé sans en être membre | audit lors de l'ajout de l'accès admin cross-clan | Vérification d'appartenance (ou bypass admin) ajoutée au POST |

---

### V3.1 — Corrections, responsive & batterie de tests

Cette phase fait suite à la V3 : correction de deux incohérences constatées en usage,
mise en place d'une batterie de tests (unitaires, intégration, E2E), et audit systématique
qui a débusqué plusieurs bugs non détectés par la relecture ou le typage.

#### §1 — Regroupement « App » sur la ClanNavbar

La navbar du hub regroupait déjà Messages/Missions/Événements/Marketplace dans un dropdown
« App » ; la `ClanNavbar` a reçu le même traitement (`src/components/ClanNavbar.tsx`) :

- **Accès direct** : Accueil, Lore, Règles, Membres (+ Diplomatie si publique)
- **Dropdown « App »** (membres connectés) : Messages, Missions, Événements, Banque, Diplomatie privée
- **Accès direct** : Recrutement (point d'entrée partagé en lien externe) ; Admin (admins seulement)
- Comportement : hover sur desktop, section labellisée dans le menu burger sur mobile

> Le traducteur Mando'a n'existe que côté Hub (`/traducteur`) — il n'a jamais eu d'équivalent dans la ClanNavbar.

#### §2 — Audit responsive réel

Audit effectué à 5 largeurs (375 / 390 / 768 / 1024 / 1440 px) via Playwright, avec détection
automatique de débordement horizontal + captures. Corrections :

| Page | Problème | Correction |
|------|----------|------------|
| Membres | Tableau qui déborde sur mobile | Cartes empilées sous `md:`, tableau conservé au-delà |
| Banque | Ligne de transaction à 5 colonnes | Layout 2 lignes (montant + libellé / auteur + date) |
| Admin hub | 9 onglets qui débordent | `overflow-x-auto` sur la barre d'onglets (remplacé en V4 par une sidebar) |
| Messagerie (clan + hub) | `100vh` masqué par le clavier virtuel mobile | `100dvh` (Dynamic Viewport Height) |

#### §3 — Batterie de tests

**Vitest** (`npm test`) — tests unitaires + intégration dans `tests/` :

| Fichier | Couverture |
|---------|------------|
| `translator.test.ts` | Traductions connues, mots absents, élisions, accents, ponctuation, dico custom, sens inverse, détection de direction |
| `mandoa-auto.test.ts` | Génération déterministe, collisions, persistance `isAuto: true` |
| `clan-auth.test.ts` / `hub-auth.test.ts` | Seuils de permission (9/10/11), IDOR inter-clans, admin hub, sans-clan |
| `marketplace-route.test.ts` | Anonymat, limite 1/semaine (429), expiration J+7, clan suspendu/non-premium |
| `banque-route.test.ts` | Suspension, freemium admin-only, justificatif obligatoire, solde insuffisant |
| `suspension.test.ts` | **Data-driven : chaque méthode HTTP de chaque route clan → 403 si suspendu** |
| `clan-deletion.test.ts` | Transaction complète (reset membres, notifications, annonces marketplace, ordre, atomicité) |
| `freemium.test.ts` | Canaux plafonnés, spécialisations secrètes, couleur masquée, réversibilité |
| `freemium-visibility.test.ts` | Visibilité missions/événements gatée en création **et** en modification |
| `clan-values.test.ts`, `dm.test.ts`, `hub-users.test.ts`, `profile-cover.test.ts`, `recruitment.test.ts`, `recruitment-approval.test.ts` | Ajoutés au fil des évolutions V3.x/V4 |

**Playwright** (`npm run test:e2e`) — tests E2E dans `e2e/` : audit responsive, authentification +
dropdowns + dépôt banque, suspension end-to-end (écran de gel + 403 API), Mando'a, valeurs de clan,
recrutement, messagerie hub/DM, utilisateurs hub.

> Les fonctionnalités V4 (admin, messagerie unifiée, profils publics, pages légales, lien de clan)
> ont été vérifiées manuellement en navigateur réel (Playwright piloté ponctuellement) lors de
> l'implémentation, mais n'ont pas encore de suite de tests automatisés dédiée dans `tests/`/`e2e/` —
> une contribution bienvenue.

#### §4 — Bugs trouvés par les tests (V3.1)

| Bug | Détecté par | Correction |
|-----|-------------|------------|
| **12 handlers PUT/DELETE admin sans check de suspension** — un admin d'un clan suspendu pouvait encore modifier missions, grades, lore, règles, pages, spécialisations, canaux, diplomatie, événements, utilisateurs | `suspension.test.ts` | Ajout de `resolveClan` + `suspendedResponse` dans chaque handler concerné |
| **ClanNavbar qui déborde à 1024 px** — le menu desktop s'activait au breakpoint `lg` sans y tenir (débordement de 110 px) | audit responsive Playwright | Breakpoint desktop relevé de `lg` à `xl` (burger en dessous de 1280 px) |
| **Toggle Mando'a jamais affiché** — `auth.ts` ne propageait pas le flag `mandalorien` au JWT/session, alors que la messagerie le lit pour afficher le bouton (feature morte côté UI) | `mandoa.spec.ts` | Ajout de `mandalorien` aux callbacks `jwt` et `session` |
| **Contournement freemium de la visibilité** — le POST forçait `visibility: internal` en free, mais le PUT appliquait n'importe quelle visibilité (un clan free créait puis éditait en « global ») | `freemium-visibility.test.ts` | Gate `&& clan.premium` sur la visibilité dans les PUT missions + événements |
| Suivi email d'un canal privé sans en être membre | audit sécurité | Adhésion au canal requise avant le follow |
| Fuite Mando'a en temps réel (SSE diffusait `originalContent` à tous) | audit sécurité | Filtrage par abonné dans les deux routes SSE |
| Marketplace anonyme fuitant l'identité du vendeur (API + nom du canal de contact) | audit sécurité | Masquage sauf vendeur/admin hub |
| Route `clan/[slug]/admin/dictionary` permettant d'éditer le dictionnaire **global** | audit sécurité | Route supprimée (non référencée) |
| Missions/événements rejoignables par n'importe quel connecté | audit sécurité | Appartenance au clan + vérif `clanId` requis |

---

### V3 — Freemium, marketplace, banque, diplomatie, Mando'a

<details>
<summary>Détail complet de la V3 (cliquer pour déplier)</summary>

#### §1 — Système Freemium

**Objectif** : différencier les clans free et premium avec des fonctionnalités verrouillées.

**Schéma** (`prisma/schema.prisma`) :
```prisma
model Clan {
  premium      Boolean   @default(false)
  premiumSince DateTime?
}

model Specialization {
  color String?  // hex, premium uniquement
}
```

**Règle de gating** : blocage à l'écriture (403), masquage à la lecture — jamais de suppression de données. Réversible instantanément.

**Fichiers modifiés** :
- `src/app/api/clan/[slug]/admin/channels/route.ts` — POST : bloque si `!clan.premium && channelCount >= 1`
- `src/app/api/clan/[slug]/admin/specializations/route.ts` — POST/PUT : bloque `secret: true` et `color` si non premium
- `src/app/api/clan/[slug]/admin/missions/route.ts` — POST : force `visibility: "internal"` si non premium
- `src/app/api/clan/[slug]/admin/evenements/route.ts` — POST/PUT : même gate visibility
- `src/app/api/clan/[slug]/channels/route.ts` — GET : `take: 1` si non premium
- `src/app/api/clan/[slug]/specializations/route.ts` — GET : filtre `secret`, null la `color` si non premium
- `src/app/api/clan/[slug]/admin/settings/route.ts` — GET : retourne `premium` et `suspended`
- `src/app/clan/[slug]/admin/page.tsx` — UI : indicateurs premium dans ChannelsTab, SpecsTab, MissionsTab
- `src/app/(hub)/hub/admin/page.tsx` — toggle premium + badges dans la liste des clans

**Admin Hub** (`src/app/api/hub/admin/clans/route.ts`) :
- PUT : gère `premium` (met à jour `premiumSince`) et `suspended`

#### §2 — Marketplace

**Objectif** : espace d'échange de crédits/services entre joueurs et clans.

**Schéma** :
```prisma
model MarketplaceListing {
  id          String    @id @default(cuid())
  sellerId    String
  clanId      String?   // null = annonce joueur, renseigné = annonce clan premium
  title       String
  description String
  price       Int
  anonymous   Boolean   @default(false)
  status      String    @default("active") // "active" | "sold" | "cancelled"
  createdAt   DateTime  @default(now())
  expiresAt   DateTime? // null pour les clans, createdAt + 7j pour les joueurs
}
```

**Règles** :
- Annonce joueur : 1 par semaine glissante (sauf admin hub). Expire à J+7.
- Annonce clan : nécessite `clan.premium` + `permissionLevel >= 10`. Sans expiration.
- Contact vendeur : crée ou récupère un canal privé `clanId: null` entre acheteur et vendeur, poste un message de référence automatique.

**Fichiers créés** :
- `src/app/api/hub/marketplace/route.ts` — GET (liste active) + POST (création)
- `src/app/api/hub/marketplace/[id]/route.ts` — PUT (changer statut) + DELETE
- `src/app/api/hub/marketplace/[id]/contact/route.ts` — POST (créer canal MP)
- `src/app/(hub)/marketplace/page.tsx` — page UI complète

**Navbar** : lien Marketplace ajouté dans le dropdown "App".

#### §3 — Suspension de clan

**Objectif** : permettre aux admins Hub de geler un clan (disparaît du listing, toutes ses routes bloquées).

**Schéma** :
```prisma
model Clan {
  suspended       Boolean   @default(false)
  suspendedReason String?
  suspendedAt     DateTime?
}
```

**Fichiers modifiés** :
- `src/lib/clan-auth.ts` — ajout de `suspendedResponse()` helper (retourne 403)
- `src/app/clan/[slug]/layout.tsx` — écran de gel si `clan.suspended` (pour tous)
- `src/app/api/hub/clans/route.ts` — filtre `WHERE suspended: false` dans la liste publique
- `src/app/api/hub/admin/clans/route.ts` — PUT : gère toggle `suspended` avec `suspendedAt`
- **Tous les endpoints API clan** (~20 routes) — ajout du check `if (clan.suspended) return suspendedResponse()` après `resolveClan`

#### §4 — Suppression de clan (transaction sécurisée)

**Objectif** : suppression propre d'un clan avec reset de tous ses membres et notification.

**Fichier modifié** : `src/app/api/hub/admin/clans/route.ts` — DELETE :
```ts
await prisma.$transaction(async (tx) => {
  const members = await tx.user.findMany({ where: { clanId: id } });
  await tx.user.updateMany({ where: { clanId: id }, data: {
    clanId: null, gradeId: null, specializationId: null,
    role: "membre", grade: "Recrue", specialization: "",
    permissionLevel: 1, mandalorien: false,
  }});
  await tx.notification.createMany({ data: members.map(m => ({
    userId: m.id, type: "clan_dissolved", title: "Clan dissous",
    body: "Votre clan a été dissous par les administrateurs du Hub.",
  }))});
  await tx.clan.delete({ where: { id } });
});
```

#### §5 — Banque de clan

**Objectif** : gestion d'un solde clan avec historique journalisé et permissions configurables.

**Schéma** :
```prisma
model Clan {
  bankBalance Int @default(0)
}

model ClanBankTransaction {
  id        String   @id @default(cuid())
  clanId    String
  type      String   // "depot" | "retrait"
  amount    Int
  label     String?  // obligatoire pour retrait si clan premium
  authorId  String
  createdAt DateTime @default(now())
}
```

**Règles** :
- Clan free : seul l'admin (perm ≥ 10) peut déposer/retirer. Pas d'historique public.
- Clan premium : permissions `banque`, `banque_historique`, `banque_depot`, `banque_retrait` configurables via `PagePermission`. Justificatif (`label`) obligatoire pour tout retrait.
- Dépôt/retrait en transaction atomique (solde + log en même temps).

**Fichiers créés** :
- `src/app/api/clan/[slug]/banque/route.ts` — GET (solde + historique) + POST (transaction)
- `src/app/clan/[slug]/banque/page.tsx` — UI avec solde, formulaire, historique

**ClanNavbar** : lien "Banque" ajouté dans les liens privés.

#### §6 — Diplomatie

**Objectif** : page publique (ou restreinte) listant les relations diplomatiques d'un clan.

**Schéma** :
```prisma
model DiplomacyEntry {
  id           String         @id @default(cuid())
  clanId       String
  type         String         // "allie" | "ennemi"
  targetClanId String?        // clan du site (onDelete: SetNull)
  customName   String?        // ou nom libre
  order        Int            @default(0)
  tags         DiplomacyTag[]
}

model DiplomacyTag {
  id     String @id @default(cuid())
  clanId String
  name   String
  @@unique([clanId, name])
}
```

**Règles** :
- Page publique par défaut. Peut être rendue privée via `PagePermission` path `"diplomatie"`.
- Tags (étiquettes libres) réservés aux clans premium. Masqués à l'affichage si le clan repasse free.
- Suppression d'un clan cible : `onDelete: SetNull` — l'entrée reste mais `targetClanId` passe à null.

**Fichiers créés** :
- `src/app/api/clan/[slug]/diplomatie/route.ts` — GET public (avec gate PagePermission)
- `src/app/api/clan/[slug]/admin/diplomatie/route.ts` — CRUD admin (entrées)
- `src/app/api/clan/[slug]/admin/diplomatie/tag/route.ts` — CRUD admin (tags)
- `src/app/clan/[slug]/diplomatie/page.tsx` — page UI avec Quick Admin inline

#### §7 — Refonte du header

**Objectif** : simplifier la navigation Hub et ajouter le lien Diplomatie dans la navbar clan.

**Navbar Hub** (`src/components/Navbar.tsx`) :
- Liens Messages, Missions, Événements et Marketplace regroupés dans un dropdown **"App"** (hover desktop, dans le menu burger mobile).
- Notifications via SSE (remplace le polling — voir §9).

**ClanNavbar** (`src/components/ClanNavbar.tsx`) :
- Accepte la prop `diplomacyPublic: boolean` (passée depuis le layout).
- Diplomatie ajouté dans `publicLinks` si public, dans `privateLinks` sinon.
- Banque ajouté dans `privateLinks` (perm ≥ 1).

**Layout clan** (`src/app/clan/[slug]/layout.tsx`) :
- Calcule `diplomacyPublic` depuis `PagePermission` path `"diplomatie"` et le passe au ClanNavbar.

**Route publique clan** (`src/app/api/clan/[slug]/public/route.ts`) :
- Retourne désormais `diplomacyPublic: boolean`.

#### §8 — Chat en Mando'a

**Objectif** : permettre aux utilisateurs tagués `mandalorien` d'envoyer des messages traduits en Mando'a, incompréhensibles pour les non-Mandalorians.

**Schéma** :
```prisma
model Message {
  mandoa          Boolean  @default(false)
  originalContent String?
}

model DictionaryEntry {
  isAuto Boolean @default(false)
}
```

**Flux d'envoi** (quand le bouton "Mando'a" est actif) :
1. Le texte FR est traduit via `translate()` (dictionnaire statique + entrées DB).
2. Les mots non trouvés génèrent un mot Mando'a phonétiquement cohérent (syllabe C+V+C+V + suffixe `-ir`/`-e`/`-an`…), déterministe via hash du mot source.
3. Chaque nouveau mot est sauvegardé en DB avec `isAuto: true`. Un même mot FR produira toujours le même mot Mando'a (stabilité dans le temps).
4. `content` = texte Mando'a (vu par tous), `originalContent` = texte FR (retourné par l'API uniquement aux Mandalorians).

**Fichiers créés** :
- `src/lib/mandoa-auto.ts` — logique de génération + persistence

**Fichiers modifiés** :
- `src/app/api/clan/[slug]/channels/[id]/messages/route.ts` — GET : filtre `originalContent` selon `mandalorien` ; POST : traduit si `mandoa: true`
- `src/app/api/hub/channels/[id]/messages/route.ts` — idem
- `src/app/(hub)/hub/admin/page.tsx` — badge 🤖 Auto sur les entrées auto-générées dans l'onglet Dictionnaire
- `src/app/api/hub/admin/dictionary/route.ts` — PUT : remet `isAuto: false` quand un admin édite une entrée auto

> Le point d'envoi Mando'a décrit ici pour la messagerie de clan vit désormais dans la messagerie
> unifiée (`src/app/(hub)/messagerie/page.tsx`, voir V4 §6) — la logique serveur (`mandoa-auto.ts`)
> est inchangée.

#### §9 — Performance / Architecture

**Objectif** : remplacer le polling 30s des notifications par un SSE.

**Fichiers créés** :
- `src/app/api/hub/notifications/sse/route.ts` — endpoint SSE qui pousse le compteur de notifications non lues

**Fichiers modifiés** :
- `src/lib/sse-store.ts` — ajout de `subscribeNotif()`, `publishNotifCount()`, `notifyUser()` (côté serveur)
- `src/components/Navbar.tsx` — remplace `setInterval(fetchCount, 30000)` par `new EventSource("/api/hub/notifications/sse")`

#### §11 — Quick Admin

**Objectif** : permettre aux admins de créer, éditer et supprimer du contenu directement depuis les pages publiques, sans ouvrir le panneau admin.

**Pattern** : bouton `+ [Item]` dans le header de la page, icônes ✏/✕ sur chaque carte au hover, formulaire inline au-dessus de la liste. Réutilise les routes admin existantes — aucune nouvelle route créée.

**Pages mises à jour** :

| Page | Actions Quick Admin |
|------|---------------------|
| `clan/[slug]/missions` | Créer, éditer, supprimer une mission |
| `clan/[slug]/evenements` | Créer, éditer, supprimer un événement |
| `clan/[slug]/lore` | Créer, éditer, supprimer une section lore |
| `clan/[slug]/regles` | Créer, éditer, supprimer une section règles |
| `clan/[slug]/diplomatie` | Créer/supprimer une entrée ; gérer les tags premium |

Visibilité conditionnelle : les contrôles Quick Admin sont masqués si `permissionLevel < 10` et `hubRole !== "admin"` — la sécurité reste assurée côté API.

#### Migrations de base de données V3

Colonnes ajoutées au schéma :

| Modèle | Colonnes ajoutées |
|--------|-------------------|
| `Clan` | `premium`, `premiumSince`, `suspended`, `suspendedReason`, `suspendedAt`, `bankBalance` |
| `Specialization` | `color` |
| `Message` | `mandoa`, `originalContent` |
| `DictionaryEntry` | `isAuto` |

Nouveaux modèles créés :

| Modèle | Description |
|--------|-------------|
| `MarketplaceListing` | Annonces marketplace joueurs et clans |
| `ClanBankTransaction` | Journal des transactions bancaires |
| `DiplomacyEntry` | Entrées diplomatiques (allié/ennemi) |
| `DiplomacyTag` | Tags premium pour les entrées diplomatiques |

#### Corrections de bugs (V3 — pré-implémentation)

| Bug | Fichier | Correction |
|-----|---------|------------|
| Template literals brisés dans les sous-composants admin clan | `clan/[slug]/admin/page.tsx` | `api().replace("${slug}", slug)` + endpoints backtickés |
| `requireClanAdmin` vérifiait le rôle RP au lieu du permissionLevel | `src/lib/clan-auth.ts` | `role === "admin"` → `permissionLevel >= 10` |
| JWT non rafraîchi → permissions stales après changement admin | `src/lib/auth.ts` | Refresh DB à chaque requête (suppression du guard `if (user?.id)`) |
| Canaux hub privés sans contrôle d'accès (IDOR) | `api/hub/channels/[id]/messages/route.ts` + `sse/route.ts` | Vérification `accessClans` en GET et POST |
| Gestion utilisateurs sans vérification d'appartenance clan (IDOR) | `api/clan/[slug]/admin/users/route.ts` | Vérification `target.clanId === clan.id` avant PUT/DELETE |
| Route SSE corrompue (fichier BOM-only suite à Set-Content PowerShell) | `api/hub/channels/[id]/sse/route.ts` | Réécrite via heredoc Bash |
| `clan` undefined dans le handler PUT des événements | `api/clan/[slug]/admin/evenements/route.ts` | Ajout de `resolveClan` + `suspendedResponse` dans le handler PUT |

</details>
