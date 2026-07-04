# Parjai Web

Site vitrine et plateforme communautaire Next.js pour le clan mandalorien **Parjai** — serveur de roleplay Star Wars.

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
10. [V3 — Implémentations et modifications](#v3--implémentations-et-modifications)

---

## Vue d'ensemble

**Parjai Web** est une plateforme multi-clans destinée aux membres d'un réseau mandalorien RP. Elle combine :

- Un **Hub** central (espace inter-clans) : annuaire des clans, missions et événements globaux, messagerie, marketplace, traducteur Mando'a
- Des **espaces clan** indépendants : lore, règles, membres, grades, spécialisations, messagerie interne, banque, diplomatie
- Un **système freemium** permettant aux clans premium de débloquer des fonctionnalités avancées
- Un **admin Hub** pour la gestion globale : utilisateurs, clans, dictionnaire Mando'a, tags, configuration

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
| Runtime | Node.js (production : PM2 ou équivalent) |

---

## Structure du projet

```
prisma/
  schema.prisma          # Schéma complet de la base de données

src/
  app/
    (hub)/               # Routes du Hub (layout public/auth partagé)
      page.tsx           # Accueil Hub
      clans/             # Annuaire des clans
      marketplace/       # Marketplace inter-clans
      messagerie/        # Messagerie hub (canaux inter-clans)
      missions/          # Missions hub globales
      evenements/        # Événements hub globaux
      traducteur/        # Traducteur Français ↔ Mando'a
      notifications/     # Notifications
      contacts/          # Contacts hub
      profil/            # Profil utilisateur
      parametres/        # Paramètres compte
      contact/           # Formulaire de contact
      hub/admin/         # Panneau admin Hub (onglets : utilisateurs, clans, missions, events, dico, tags, config, contacts)
      login/
      change-password/

    clan/[slug]/         # Espace d'un clan (layout avec thème custom)
      page.tsx           # Accueil clan
      lore/              # Lore du clan
      regles/            # Règles du clan
      membres/           # Annuaire des membres
      missions/          # Missions du clan
      evenements/        # Événements du clan
      messagerie/        # Messagerie interne (canaux privés SSE)
      banque/            # Banque du clan (dépôts/retraits)
      diplomatie/        # Relations diplomatiques
      recrutement/       # Formulaire de candidature
      traducteur/        # Traducteur Mando'a (accès clan)
      admin/             # Dashboard admin clan (onglets multiples)

    api/
      auth/              # Changement de mot de passe
      clan/[slug]/       # API clan (publique + admin)
        public/          # Infos publiques du clan
        banque/          # Banque
        diplomatie/      # Diplomatie (lecture publique)
        channels/        # Canaux + SSE + messages + membres
        missions/        # Missions
        evenements/      # Événements
        specializations/ # Spécialisations
        lore/            # Sections lore
        rules/           # Sections règles
        members/         # Membres
        admin/           # Routes admin (grades, specs, canaux, missions, events, lore, rules, users, whitelist, settings, tags, pages, diplomatie, recrutement)
      hub/
        channels/        # Canaux hub + SSE + messages
        missions/        # Missions hub
        events/          # Événements hub
        marketplace/     # Marketplace
        clans/           # Liste publique des clans
        notifications/   # SSE notifications
        admin/           # Admin Hub (users, clans, missions, events, dictionary, tags, config)
      notifications/     # Compteur notifications
      translate/         # API traducteur
      profil/            # Mise à jour profil
      contacts/          # Contacts
      tags/              # Tags clan

  components/
    Navbar.tsx           # Navigation Hub (dropdown App, SSE notifs)
    ClanNavbar.tsx       # Navigation clan (liens dynamiques selon perms)
    Footer.tsx
    Providers.tsx        # SessionProvider NextAuth

  lib/
    auth.ts              # Config NextAuth, JWT callback (refresh DB à chaque requête)
    prisma.ts            # Singleton Prisma Client
    clan-auth.ts         # requireClanAdmin(), resolveClan(), suspendedResponse(), notFound(), denied()
    hub-auth.ts          # requireHubAdmin(), requireModerator()
    admin-check.ts       # requireAdmin() global
    sse-store.ts         # Store SSE en mémoire (messages canaux + notifications)
    translator.ts        # Moteur de traduction FR ↔ Mando'a (lemmatisation, élisions)
    mandoa-auto.ts       # Génération automatique de mots Mando'a + persistance DB
    dictionary.ts        # Dictionnaire de base FR → Mando'a
    dictionary-extended.ts
    french-lemmatizer.ts # Lemmatiseur français (7800+ verbes)
    notify-followers.ts  # Envoi d'emails aux abonnés d'un canal
    mail.ts              # Wrapper Nodemailer
    public-id.ts         # Génération des IDs publics utilisateurs (6 lettres)
```

---

## Schéma de données

### Modèles principaux

| Modèle | Description |
|--------|-------------|
| `Clan` | Clan avec thème (colorBg/Primary/Accent), freemium, suspension, banque |
| `User` | Utilisateur avec appartenance clan, grade, spéc, niveau de permission |
| `Grade` | Grade scoped à un clan (order, defaultPermission) |
| `Specialization` | Spécialisation scoped à un clan (secret, color premium) |
| `Channel` | Canal de messagerie (clan ou hub, public ou privé) |
| `Message` | Message avec support Mando'a (mandoa, originalContent) |
| `Mission` | Mission (clan ou hub, visibility interne/globale/privée) |
| `Event` | Événement (clan ou hub, hubStatus pour proposer au Hub) |
| `PagePermission` | Permission par page/action au sein d'un clan (path + minPermission) |
| `LoreSection` | Section lore d'un clan |
| `RuleSection` | Section règles d'un clan |
| `Recruitment` | Candidature de recrutement |
| `Notification` | Notification in-app utilisateur |
| `DictionaryEntry` | Entrée FR ↔ Mando'a (isAuto pour les entrées générées automatiquement) |
| `MarketplaceListing` | Annonce marketplace (joueur ou clan premium) |
| `ClanBankTransaction` | Transaction bancaire journalisée |
| `DiplomacyEntry` | Entrée diplomatique (allié/ennemi) d'un clan |
| `DiplomacyTag` | Tag premium pour les entrées diplomatiques |
| `Contact` | Relation de contact entre deux utilisateurs |
| `ClanWhitelist` | Liste blanche d'accès à un clan |
| `Report` | Signalement |
| `HubConfig` | Configuration Hub clé/valeur |
| `ContactMessage` | Formulaire de contact Hub |

### Niveaux de permission

| Valeur | Rôle |
|--------|------|
| 0 | Non connecté / hors clan |
| 1 | Membre standard |
| 3–9 | Grades intermédiaires (configurables) |
| 10+ | Admin de clan |
| hubRole = "moderator" | Modérateur Hub |
| hubRole = "admin" | Admin Hub (accès total) |

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

- `requireClanAdmin(slug)` — vérifie `permissionLevel >= 10` dans le clan
- `resolveClan(slug)` — récupère le clan avec tous les champs nécessaires (premium, suspended…)
- `suspendedResponse()` — retourne 403 si clan suspendu
- `requireHubAdmin()` — vérifie `hubRole === "admin"`
- `requireModerator()` — vérifie `hubRole === "moderator" | "admin"`
- `PagePermission` — mécanisme générique de permission par page/action (réutilisé pour banque, diplomatie)

### Suspension de clan

Un clan suspendu est filtré de la liste publique et bloque **toutes** ses routes API avec 403. Le layout `clan/[slug]/layout.tsx` affiche un écran de gel à la place du contenu, pour tous les utilisateurs y compris les admins clan.

---

## Fonctionnalités

### Hub
- **Accueil** : présentation du réseau, liens rapides
- **Annuaire des clans** : liste filtrée (hors clans suspendus), accès direct
- **Messagerie hub** : canaux inter-clans avec SSE temps réel, canaux privés par clan (accessClans)
- **Missions hub** : missions globales ouvertes à tous, participation
- **Événements hub** : événements globaux, inscription
- **Marketplace** : annonces joueurs (1/semaine) et clans premium (illimitées), contact par canal MP privé
- **Traducteur Mando'a** : traduction FR ↔ Mando'a avec lemmatisation, dictionnaire étendu
- **Notifications** : in-app temps réel (SSE), badge dans la Navbar
- **Profil** : pseudo affiché, anonymat, préférences de notifications
- **Admin Hub** : gestion utilisateurs, clans (premium/suspension/suppression), missions, événements, dictionnaire, tags, config

### Espace clan
- **Accueil** : présentation, thème custom (colorBg/Primary/Accent)
- **Lore** : sections éditables (Quick Admin inline)
- **Règles** : sections éditables (Quick Admin inline)
- **Membres** : liste avec grades, spécialisations, niveaux de permission
- **Missions** : missions du clan + participation (Quick Admin inline)
- **Événements** : événements du clan + inscription (Quick Admin inline)
- **Messagerie** : canaux privés SSE, notifications email, mode Mando'a
- **Banque** : solde, dépôts/retraits journalisés, permissions configurables
- **Diplomatie** : alliés/ennemis (clans du site ou custom), tags premium
- **Recrutement** : formulaire candidature, gestion admin
- **Traducteur** : traducteur Mando'a accessible aux membres du clan
- **Admin** : dashboard multi-onglets (grades, specs, canaux, missions, events, lore, règles, membres, whitelist, recrutement, tags, paramètres)

### Freemium

Le système freemium bloque à l'écriture et masque à la lecture — les données ne sont jamais supprimées. Reversible instantanément si le flag `premium` change.

| Fonctionnalité | Free | Premium |
|----------------|------|---------|
| Canaux de messagerie | 1 (Général) | Illimité |
| Spécialisations secrètes | ✗ | ✓ |
| Couleur custom spécialisation | ✗ | ✓ |
| Visibility missions/events | internal uniquement | internal + private + global |
| Annonces Marketplace (clan) | ✗ | Illimitées |
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
| `NEXTAUTH_URL` | ✓ | URL publique du site (`https://parjai.exemple.fr`) |
| `SMTP_HOST` | ✗ | Hôte SMTP pour les emails |
| `SMTP_PORT` | ✗ | Port SMTP (587 ou 465) |
| `SMTP_USER` | ✗ | Identifiant SMTP |
| `SMTP_PASS` | ✗ | Mot de passe SMTP |
| `SMTP_FROM` | ✗ | Adresse expéditeur des emails |

---

## V3 — Implémentations et modifications

Cette section documente toutes les modifications apportées dans la version 3 du projet.

---

### §1 — Système Freemium

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

---

### §2 — Marketplace

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

---

### §3 — Suspension de clan

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

---

### §4 — Suppression de clan (transaction sécurisée)

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

---

### §5 — Banque de clan

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

---

### §6 — Diplomatie

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

---

### §7 — Refonte du header

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

---

### §8 — Chat en Mando'a

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
- `src/app/clan/[slug]/messagerie/page.tsx` — bouton "Mando'a", affichage italique doré, `<details>` pour voir la traduction
- `src/app/(hub)/hub/admin/page.tsx` — badge 🤖 Auto sur les entrées auto-générées dans l'onglet Dictionnaire
- `src/app/api/hub/admin/dictionary/route.ts` — PUT : remet `isAuto: false` quand un admin édite une entrée auto

---

### §9 — Performance / Architecture

**Objectif** : remplacer le polling 30s des notifications par un SSE.

**Fichiers créés** :
- `src/app/api/hub/notifications/sse/route.ts` — endpoint SSE qui pousse le compteur de notifications non lues

**Fichiers modifiés** :
- `src/lib/sse-store.ts` — ajout de `subscribeNotif()`, `publishNotifCount()`, `notifyUser()` (côté serveur)
- `src/components/Navbar.tsx` — remplace `setInterval(fetchCount, 30000)` par `new EventSource("/api/hub/notifications/sse")`

> Les points restants de §9 (découpage des pages admin en lazy components) et §10 Mobile/Responsive (responsive systématique des tableaux admin) restent à traiter progressivement lors des évolutions futures.

---

### §11 — Quick Admin

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

---

### Migrations de base de données V3

Après déploiement, exécuter sur le VPS :

```bash
npx prisma db push --skip-generate
```

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

---

### Corrections de bugs (V3 — pré-implémentation)

| Bug | Fichier | Correction |
|-----|---------|------------|
| Template literals brisés dans les sous-composants admin clan | `clan/[slug]/admin/page.tsx` | `api().replace("${slug}", slug)` + endpoints backtickés |
| `requireClanAdmin` vérifiait le rôle RP au lieu du permissionLevel | `src/lib/clan-auth.ts` | `role === "admin"` → `permissionLevel >= 10` |
| JWT non rafraîchi → permissions stales après changement admin | `src/lib/auth.ts` | Refresh DB à chaque requête (suppression du guard `if (user?.id)`) |
| Canaux hub privés sans contrôle d'accès (IDOR) | `api/hub/channels/[id]/messages/route.ts` + `sse/route.ts` | Vérification `accessClans` en GET et POST |
| Gestion utilisateurs sans vérification d'appartenance clan (IDOR) | `api/clan/[slug]/admin/users/route.ts` | Vérification `target.clanId === clan.id` avant PUT/DELETE |
| Route SSE corrompue (fichier BOM-only suite à Set-Content PowerShell) | `api/hub/channels/[id]/sse/route.ts` | Réécrite via heredoc Bash |
| `clan` undefined dans le handler PUT des événements | `api/clan/[slug]/admin/evenements/route.ts` | Ajout de `resolveClan` + `suspendedResponse` dans le handler PUT |

---

## V3.1 — Corrections, responsive & batterie de tests

Cette phase fait suite à la V3 : correction de deux incohérences constatées en usage,
mise en place d'une batterie de tests (unitaires, intégration, E2E), et audit systématique
qui a débusqué plusieurs bugs non détectés par la relecture ou le typage.

### §1 — Regroupement « App » sur la ClanNavbar

La navbar du hub regroupait déjà Messages/Missions/Événements/Marketplace dans un dropdown
« App » ; la `ClanNavbar` a reçu le même traitement (`src/components/ClanNavbar.tsx`) :

- **Accès direct** : Accueil, Lore, Règles, Membres (+ Diplomatie si publique)
- **Dropdown « App »** (membres connectés) : Messages, Missions, Événements, Banque, Diplomatie privée
- **Accès direct** : Recrutement, Traducteur (points d'entrée partagés en lien externe) ; Admin (admins seulement)
- Comportement : hover sur desktop, section labellisée dans le menu burger sur mobile

### §2 — Audit responsive réel

Audit effectué à 5 largeurs (375 / 390 / 768 / 1024 / 1440 px) via Playwright, avec détection
automatique de débordement horizontal + captures. Corrections :

| Page | Problème | Correction |
|------|----------|------------|
| Membres | Tableau qui déborde sur mobile | Cartes empilées sous `md:`, tableau conservé au-delà |
| Banque | Ligne de transaction à 5 colonnes | Layout 2 lignes (montant + libellé / auteur + date) |
| Admin hub | 9 onglets qui débordent | `overflow-x-auto` sur la barre d'onglets |
| Messagerie (clan + hub) | `100vh` masqué par le clavier virtuel mobile | `100dvh` (Dynamic Viewport Height) |

### §3 — Batterie de tests

**Vitest** (`npm test`) — **150 tests unitaires + intégration** dans `tests/` :

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

**Playwright** (`npm run test:e2e`) — **56 tests E2E** dans `e2e/` : audit responsive (50),
authentification + dropdowns + dépôt banque (4), suspension end-to-end (écran de gel + 403 API), Mando'a.

### §4 — Bugs trouvés par les tests

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
