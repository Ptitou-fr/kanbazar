# ADR 001 — Base SQLite sur Turso, client libSQL sans ORM

- Status: accepted
- Date: 2026-11-22
- Scope: framing

## Context
INTENT.md impose SQLite via Turso et un déploiement sur Vercel. En déployé,
les données doivent survivre aux instances et aux redéploiements. La base doit
pouvoir être remplacée en ne touchant que la couche données. Les tests des
règles métier tournent sans base réelle. Le périmètre est celui d'un mini
Kanban pour une petite équipe : une seule table de cartes.

## Decision
- Base SQLite hébergée sur Turso, une seule base `kanbazar` en
  `aws-us-west-2`, fonctions Vercel en `pdx1` à côté.
- Pilote `@libsql/client` utilisé directement, sans ORM, confiné à `data/`.
  ESLint (`driverImports`) et un grep interdisent son import ailleurs.
- Configuration par `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`. Sans URL
  hors production : fichier local `.data/kanbazar.db`. Sans URL en production :
  l'application refuse de démarrer.
- Schéma migré à l'ouverture par une liste de migrations dans `data/db.ts`,
  version rangée dans une table `schema_version` à une ligne.
- Production et prévisualisations partagent la même base.

## Considered options
- Autre moteur (Postgres, base gérée Vercel…) — rejected because SQLite via
  Turso est imposé par INTENT.md.
- Version du schéma dans `PRAGMA user_version` — rejected because Turso refuse
  de l'écrire sur une base distante (il en permet la lecture).
- ORM (Drizzle, Prisma…) — rejected because le périmètre est trop petit pour
  en justifier un.
- Une base Turso par environnement (production / prévisualisation) —
  rejected because le périmètre est trop petit pour en justifier plusieurs.

## Consequences
- Remplacer la base ne touche que `data/`, la configuration et la migration.
- Les services se testent avec un faux store, sans base.
- Migrations écrites à la main, en SQL, sans outil de rollback.
- Une prévisualisation modifie les vraies cartes.
- Les bases locales créées avant `schema_version` reprennent leur version
  depuis `PRAGMA user_version`.
- Si le périmètre grandit, l'ORM et la base par environnement sont à
  rouvrir par un nouvel ADR.
