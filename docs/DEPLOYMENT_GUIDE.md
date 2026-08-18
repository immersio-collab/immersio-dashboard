# Guide de Déploiement et Connexion à la Base de Données

Ce guide explique comment relier le dashboard Immersio à votre base de données Google Sheets, puis comment publier le projet sur Vercel.

## Étape 1 : Préparer le Google Sheet (Base de données)

Votre fichier Google Sheets doit impérativement avoir une feuille nommée **"Suivi Leads"** avec les colonnes exactes suivantes (l'ordre n'a pas d'importance, mais les noms doivent être exacts) :
`LeadID`, `Nom`, `Téléphone`, `Canal`, `Ville`, `Type de bien`, `Surface`, `Date formulaire`, `Doublon`, `Date 1er contact`, `Appel téléphonique`, `Statut`, `Contacté sur whatsapp`, `Devis envoyé`, `Demo envoyé`, `Prix proposé (MAD)`, `Date dernier échange`, `Relance 1 (auto)`, `Relance 2 (auto)`, `Relance 3 (auto)`, `Notes`, `Archivé`.

*(Note : `LeadID` et `Archivé` sont critiques pour le bon fonctionnement).*

## Étape 2 : Déployer l'API Google Apps Script

C'est ce script qui fera le pont sécurisé entre le dashboard et le Google Sheet.

1. Ouvrez votre Google Sheet "Suivi Leads".
2. Allez dans **Extensions > Apps Script**.
3. Effacez le code existant et collez le contenu du fichier local `docs/google-apps-script.js` (créé lors de la session 002).
4. Modifiez la ligne :
   `const SECRET_KEY = "REMPLACEZ_CECI_PAR_UN_LONG_SECRET_ALEATOIRE";`
   en choisissant une phrase de passe très longue. Notez-la de côté, ce sera votre variable `LEADS_SECRET` !
5. Cliquez sur **Déployer > Nouvelle implémentation**.
6. Sélectionnez le type **Application Web** (icône d'engrenage).
7. Configurez ainsi :
   - Exécuter en tant que : **Moi** (votre compte Google).
   - Qui a accès : **Tout le monde** (La sécurité est garantie par le SECRET_KEY).
8. Cliquez sur **Déployer** (Acceptez les autorisations Google si demandé).
9. Copiez l'**URL de l'application Web** (elle se termine par `/exec`). Ce sera votre variable `LEADS_SCRIPT_URL`.

## Étape 3 : Générer le hash de mot de passe administrateur

Le dashboard n'accepte qu'un seul mot de passe pour s'y connecter, mais il doit être stocké sous forme de hash cryptographique.

1. Sur votre ordinateur, dans le dossier du projet, ouvrez le terminal.
2. Exécutez :
   ```bash
   npm run hash-password
   ```
3. Tapez le mot de passe que vous souhaitez utiliser pour vous connecter au dashboard et appuyez sur Entrée.
4. Le terminal affichera un hash (ex: `$2a$10$w09uYm...`). Copiez ce hash complet. Ce sera votre variable `DASHBOARD_PASSWORD_HASH`.

## Étape 4 : Déployer sur Vercel

1. Poussez votre code sur un dépôt GitHub (ex: `git add .`, `git commit -m "Init"`, `git push origin main`).
2. Allez sur [Vercel.com](https://vercel.com/) et connectez-vous avec GitHub.
3. Cliquez sur **Add New > Project**.
4. Importez votre dépôt GitHub `immersio-dashboard`.
5. Dans la section **Environment Variables** avant de cliquer sur Deploy, ajoutez ces 4 variables :

   - Nom : `LEADS_SCRIPT_URL`
     Valeur : *L'URL `/exec` copiée à l'étape 2.*
   - Nom : `LEADS_SECRET`
     Valeur : *Le secret défini dans le script à l'étape 2.*
   - Nom : `DASHBOARD_PASSWORD_HASH`
     Valeur : *Le hash généré à l'étape 3.*
   - Nom : `SESSION_SECRET`
     Valeur : *Une longue chaîne aléatoire de 32 caractères minimum (vous pouvez en taper une au hasard sur votre clavier).*

6. Cliquez sur **Deploy**.

## Étape 5 : Profitez de votre Dashboard

Une fois le build terminé, Vercel vous donnera une URL publique (ex: `https://immersio-dashboard.vercel.app`).
Allez dessus, connectez-vous avec le mot de passe clair que vous aviez choisi à l'étape 3, et votre dashboard affichera les données lues en direct depuis votre Google Sheet !
