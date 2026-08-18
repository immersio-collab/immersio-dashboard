# Immersio Dashboard

Le dashboard privé pour visualiser et gérer les leads immobiliers Immersio.

Ce projet est une application [Next.js](https://nextjs.org/) (App Router) connectée à une base de données sur Google Sheets via Google Apps Script.

## Déploiement sur Vercel

Ce projet est prêt à être déployé sur Vercel. Lors du déploiement, vous devrez configurer les variables d'environnement suivantes dans les paramètres du projet sur Vercel (Project Settings > Environment Variables).

### Variables d'environnement requises

| Variable | Description | Comment l'obtenir |
| :--- | :--- | :--- |
| `LEADS_SCRIPT_URL` | L'URL complète de l'API Google Apps Script (Web App). | Déployez le script fourni dans le projet (voir la doc de connexion) et copiez l'URL "URL de l'application Web" (se terminant par `/exec`). |
| `LEADS_SECRET` | Clé secrète pour authentifier les requêtes entre ce dashboard et Google Apps Script. | Inventez une longue chaîne de caractères aléatoires (ex: `votre-secret-complexe-123`). Assurez-vous d'utiliser **exactement la même** dans le code Google Apps Script (`SECRET_KEY`). |
| `SESSION_SECRET` | Clé cryptographique pour signer les cookies de session des administrateurs. | Générez une clé aléatoire forte d'au moins 32 caractères. |
| `DASHBOARD_PASSWORD_HASH` | Le hash bcrypt du mot de passe administrateur pour se connecter au dashboard. | Exécutez `npm run hash-password` localement, entrez votre mot de passe, et copiez le hash généré (qui commence par `$2a$...`). |

## Développement local

1. Clonez le dépôt GitHub.
2. Installez les dépendances : `npm install`
3. Copiez le fichier `.env.local.example` vers `.env.local` et remplissez vos valeurs :
   ```bash
   cp .env.local.example .env.local
   ```
4. Lancez le serveur de développement : `npm run dev`
5. Ouvrez [http://localhost:3000](http://localhost:3000)

## Commandes utiles

- `npm run dev` : Lance le serveur de développement.
- `npm run build` : Compile le projet pour la production.
- `npm run hash-password` : Utilitaire pour générer le hash bcrypt d'un mot de passe clair.
