# Archives Management

Application locale de gestion des archives physiques : stockage, recherche, demandes d'accès, validation, remise signée, suivi, retour, RBAC et audit.

Le projet fonctionne avec Next.js et PostgreSQL natif. Docker n'est ni requis ni utilisé.

## Versions requises

- Node.js : `^20.19.0 || ^22.12.0 || >=24.0.0`
- npm
- PostgreSQL 17 ou 18

La recette Step 7 a été exécutée avec Node.js 24.13.0, npm 11.6.2, PostgreSQL 18.3, Next.js 16.4.3 et Prisma 7.10.1.

## Installation locale

Le guide détaillé de création du rôle et des bases est disponible dans [docs/local-postgresql.md](docs/local-postgresql.md).

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:status
npm run db:deploy
npm run db:generate
npm run db:check
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

`db:deploy` applique uniquement les migrations validées. Il ne réinitialise pas la base et ne lance pas de seed.

## Variables d'environnement

Le fichier ignoré `.env` contient uniquement les trois valeurs nécessaires à
l'exécution locale normale :

- `DATABASE_URL` : base locale principale ;
- `AUTH_SECRET` : chiffrement et signature des sessions Auth.js ;
- `AUTH_RATE_LIMIT_SECRET` : HMAC indépendant pour la limitation des connexions.

Générez les secrets avec :

```bash
openssl rand -base64 48
```

Ne versionnez jamais `.env`, un mot de passe ou une preuve de signature.

Les usages spécialisés restent séparés :

- `SHADOW_DATABASE_URL` se place dans `.env.local` uniquement pour créer de
  nouvelles migrations avec `npm run db:migrate` ;
- `TEST_DATABASE_URL` se place dans `.env.test.local` et doit viser une base
  dédiée dont le nom contient `_test` ;
- `AUTH_URL`, `AUTH_TRUST_HOST`, `APP_TIME_ZONE` et `SIGNATURE_STORAGE_DIR`
  sont des surcharges facultatives documentées dans `.env.example`.

## Initialisation RBAC et premier administrateur

`npm run db:seed` synchronise rôles et permissions sans supprimer les utilisateurs. Si aucun administrateur actif n'existe, fournissez temporairement :

```dotenv
BOOTSTRAP_ADMIN_NAME="Nom administrateur"
BOOTSTRAP_ADMIN_EMAIL="adresse-interne@example.test"
BOOTSTRAP_ADMIN_PASSWORD="mot-de-passe-fort-fourni-localement"
```

Exécutez ensuite :

```bash
npm run db:seed
```

Effacez les trois valeurs de bootstrap après succès. Aucun mot de passe par défaut n'est fourni.

## Jeu de démonstration sûr

Le seed de démonstration est volontairement séparé. Il :

- fonctionne uniquement contre PostgreSQL local ;
- exige `NODE_ENV=development` et `ALLOW_DEMO_SEED=true` ;
- exige `DEMO_LOGIN_ENABLED=true` avant de créer des comptes connectables ;
- lit alors un mot de passe conforme depuis `DEMO_USER_PASSWORD` sans l'afficher ;
- utilise uniquement des adresses `@example.test` et des contenus marqués `DEMO_2026` ;
- refuse d'écraser une référence existante non marquée démo ;
- ne supprime et ne réinitialise aucune donnée ;
- peut être relancé sans créer de doublons.

Création du jeu sans activer les connexions :

```bash
NODE_ENV=development ALLOW_DEMO_SEED=true \
  DEMO_LOGIN_ENABLED=false npm run db:seed:demo
```

Activation optionnelle des comptes avec une saisie silencieuse :

```bash
read -rs "DEMO_USER_PASSWORD?Mot de passe de démonstration : "; echo
export DEMO_USER_PASSWORD
NODE_ENV=development ALLOW_DEMO_SEED=true \
  DEMO_LOGIN_ENABLED=true npm run db:seed:demo
unset DEMO_USER_PASSWORD
```

Exemples de comptes synthétiques :

- `admin.demo01@example.test`
- `archiviste.demo01@example.test`
- `validateur.demo01@example.test`
- `demandeur.demo01@example.test`

Le script prépare 30 emplacements, 100 boîtes, 1 000 documents, 20 utilisateurs, 150 demandes et 80 mouvements. Voir [`docs/demo-database.md`](docs/demo-database.md) pour les contrôles, comptes, résultats et scénarios.

## Commandes de qualité

```bash
npx prisma validate
npm run db:generate
npm run typecheck
npm run lint
npm run test:run
npm run test:e2e
npm run build
```

Les tests base de données et Playwright chargent `TEST_DATABASE_URL` depuis
`.env.test.local`. Ils tronquent cette base dédiée : ne la faites jamais pointer
vers une base contenant des données réelles.

## Documentation

- [Dossier de livraison client Step 8](docs/client-delivery/README.md)
- [Matrice de traçabilité](docs/requirements-traceability.md)
- [Dossier de démonstration client](docs/client-demo/01-project-overview.md)
- [Workflow métier](docs/step4-business-workflow.md)
- [UI, recherche et qualité](docs/step5-ui-search-quality.md)
- [Architecture de données](docs/database-design.md)
- [Authentification et RBAC](docs/step3-auth-rbac.md)
- [PostgreSQL local](docs/local-postgresql.md)

## Limite de statut

Le projet est préparé pour une démonstration et une recette locales. Il n'est pas déclaré prêt pour la production : déploiement, sauvegardes, supervision, stockage objet, sécurité d'infrastructure et reprise après sinistre restent hors de Step 7.
