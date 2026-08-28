# Immersio Dashboard

Le dashboard privé Immersio : gestion des leads immobiliers et des tours virtuels.

Application [Next.js](https://nextjs.org/) (App Router) connectée à une base
[Supabase](https://supabase.com/) (PostgreSQL).

## Ce que fait le dashboard

- **Leads** — consultation, qualification et archivage des leads Meta. Ils arrivent
  par `POST /api/leads/webhook`, alimenté par le script Google Apps Script
  `scripts/google-apps-script/sync-to-supabase.gs` branché sur le Sheet "immersio leads".
- **Tours virtuels** — CRUD des visites publiées sur `immersio.ma/visite/[slug]`.
  Le site public les lit via `GET /api/public/tours`, et chaque création,
  modification ou suppression invalide immédiatement la page correspondante
  sur immersio.ma (voir ci-dessous).

## Propagation vers immersio.ma

Le site met en cache chaque page `/visite/[slug]` sous un tag `tour-<slug>`.
À chaque mutation, `lib/revalidate.ts` envoie ce tag à
`https://immersio.ma/api/revalidate`, qui vide le cache de cette seule page.

Si l'appel échoue, il est journalisé (`[revalidate]` dans les logs Vercel) puis
ignoré : l'écriture en base a déjà réussi, seule la fraîcheur d'affichage est en
jeu. Le site rattrape alors le changement dans les 5 minutes via sa fenêtre ISR.
**Symptôme d'une panne : les modifications mettent quelques minutes à apparaître
au lieu d'être instantanées** — il n'y a aucune autre alerte.

## Déploiement sur Vercel

Configurez les variables ci-dessous dans Project Settings > Environment Variables.
Vercel n'applique une variable qu'au **déploiement suivant** : après un ajout ou
une modification, redéployez.

### Requises

| Variable | Description | Comment l'obtenir |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase. | Supabase > Project Settings > API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète `service_role`. Le backend l'utilise pour contourner les politiques RLS. **Ne jamais utiliser la clé publique `anon`.** | Supabase > Project Settings > API. |
| `SESSION_SECRET` | Clé de signature des cookies de session admin. | Une chaîne aléatoire d'au moins 32 caractères. |
| `DASHBOARD_PASSWORD_HASH` | Hash bcrypt du mot de passe administrateur. | `npm run hash-password`, puis copiez le hash (commence par `$2a$`). |

L'application refuse de démarrer si l'une d'elles manque (validation dans `lib/config.ts`).

### Optionnelles

| Variable | Description |
| :--- | :--- |
| `WEBHOOK_SECRET` | Secret partagé exigé sur `POST /api/leads/webhook`. Doit être identique à `SECRET_KEY` dans `sync-to-supabase.gs`. Sans elle, le webhook refuse tout. |
| `SITE_REVALIDATE_URL` | Endpoint de revalidation d'immersio.ma (`https://immersio.ma/api/revalidate`). |
| `REVALIDATION_SECRET` | Doit être **identique** au `REVALIDATION_SECRET` du projet Vercel `immersio.ma`. |

Sans les deux dernières, le dashboard fonctionne normalement : les tours se
propagent simplement via la fenêtre ISR du site au lieu d'être instantanés.

## Développement local

1. Clonez le dépôt.
2. `npm install`
3. `cp .env.local.example .env.local` puis renseignez les valeurs.
4. `npm run dev`
5. Ouvrez [http://localhost:3000](http://localhost:3000)

## Commandes

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run lint` — ESLint
- `npm run hash-password` — génère le hash bcrypt d'un mot de passe
