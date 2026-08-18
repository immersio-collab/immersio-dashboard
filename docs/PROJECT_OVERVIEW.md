# Immersio Dashboard — Bilan du Projet

Ce document résume l'intégralité du travail réalisé pour construire le Dashboard Immersio de A à Z.

## 1. Architecture Globale

Le projet est construit avec la stack moderne **Next.js 14 (App Router)** et hébergé sur un dépôt GitHub, prêt à être déployé sur **Vercel**.

La particularité de cette architecture est son backend "serverless" :
- **Base de données** : Un fichier Google Sheets partagé ("Suivi Leads").
- **API** : Un script Google Apps Script attaché à ce Sheet, déployé en tant qu'application Web.
- **Frontend/Dashboard** : Le projet Next.js actuel qui communique exclusivement avec Apps Script côté serveur (Server Components et Route Handlers) pour masquer totalement la clé secrète.

### Stack Technique
- **Framework** : Next.js 14 (React 18)
- **Styling** : Tailwind CSS (avec variables CSS natives et classes personnalisées dans `globals.css`)
- **Icônes** : `lucide-react`
- **Authentification** : `jose` (JWT) & `bcryptjs` (Hashage de mot de passe)
- **Typage** : TypeScript strict

## 2. Fonctionnalités Développées

### Authentification & Sécurité
- **Login par mot de passe unique** : Réservé à l'administrateur. Le mot de passe n'est jamais stocké en clair, seul son hash `bcrypt` existe dans les variables d'environnement.
- **Session chiffrée** : À la connexion, un cookie de session JWT signé cryptographiquement avec `jose` est généré (valide 30 jours).
- **Protection par Middleware** : Le fichier `middleware.ts` bloque l'accès à toute route `/dashboard/*` si la session est absente ou invalide, et redirige vers `/login`.

### Design System & Layout
- **Thème Minimaliste** : Couleurs de fond sombres/neutres (`surface`, `surface-muted`), texte subtil, pas de bordures superflues, style très premium (effets de hover doux).
- **Layout Principal** : Une barre latérale gauche (Sidebar) de navigation avec les différents modules ("Vue d'ensemble", "Leads", et les modules en "Bientôt" : Portfolio, Blog, Tours). Le layout principal encadre les pages enfants.

### Vue d'Ensemble (Accueil)
- Récupère tous les leads en temps réel (côté serveur).
- Affiche **4 cartes de compteurs (KPIs)** : Leads actifs, Relances en retard, Doublons non résolus, Jamais contactés.
- Liste les **Alertes du jour** : Identifie dynamiquement via des règles métier pures (`lib/lead-alerts.ts`) les leads nécessitant une action prioritaire et permet de cliquer pour ouvrir leur fiche.

### Gestion des Leads (Page "Leads")
- **Tableau Interactif** : Affiche les informations clés (Nom, Téléphone cliquable, Ville, Canal, Statut, Date).
- **Filtres Avancés** : Recherche textuelle, filtre par Statut, filtre par Canal, bouton pour masquer/afficher les Doublons. Tri au clic sur les en-têtes (Nom, Statut, Date).
- **Panneau Latéral d'Édition (Drawer)** :
  - S'ouvre au clic sur une ligne.
  - Sépare clairement les champs figés (Nom, Téléphone provenant de Meta/Google Form) et les **champs commerciaux éditables** (Statut, Devis envoyé, Date de relance, Notes, etc.).
  - Édition robuste avec des formulaires adaptés (`<input type="date">`, `<datalist>`, `<textarea>`).
  - Bouton Enregistrer qui n'envoie au serveur que les modifications réelles via une route `PATCH`.
- **Archivage (Soft Delete)** : Un flow à deux étapes (Bouton "Archiver" -> Confirmation "Oui / Non") qui change le statut du lead à `Archivé = true` sur le Google Sheet sans le supprimer physiquement. Géré côté serveur via une route `POST`.

## 3. Robustesse & Accessibilité

- **États de chargement (Skeletons)** : Au lieu de bloquer l'écran blanc, des `loading.tsx` affichent une ossature du tableau et des compteurs pendant le chargement des données.
- **Error Boundaries** : Si Google Apps Script tombe en panne ou que la clé est invalide, l'application ne crashe pas. Elle affiche une UI propre "Impossible de charger les données" avec un bouton de réessai.
- **Accessibilité (a11y)** : Tous les champs interactifs possèdent des labels (liés par `id` / `htmlFor`), les boutons ont des rôles clairs, favorisant la navigation au clavier et la lecture d'écran.
- **Typage fort** : 0 erreur TypeScript, 0 warning ESLint. Tous les modèles (type `Lead`) calquent parfaitement les colonnes du tableau Google.

Ce socle est maintenant stable, sécurisé, et prêt à absorber des milliers de leads avec une excellente performance grâce au rendu côté serveur natif de Next.js.
