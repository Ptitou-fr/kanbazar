# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`INTENT.md` est la spécification canonique du produit et de l'architecture,
tenue par Patrick ; `AGENTS.md` est généré par `next dev`. Les deux sont
importés ci-dessous. En cas de désaccord entre ce fichier et `INTENT.md`,
`INTENT.md` l'emporte.

@INTENT.md
@AGENTS.md

## Commandes

Gestionnaire de paquets : pnpm (`packageManager: pnpm@10.32.1`).

```bash
pnpm dev      # next dev
pnpm build    # build de production, doit passer (critère d'acceptation)
pnpm lint     # eslint, config flat (next core-web-vitals + typescript)
pnpm test     # vitest run, une seule exécution
pnpm test services/__tests__/card-service.test.ts   # un seul fichier
```

Tests dans un dossier `__tests__/` à l'intérieur de leur couche
(`data/__tests__/`, `services/__tests__/`, `components/__tests__/`), nommés
`*.test.ts[x]` et important via `@/`. Ils sont soumis aux mêmes frontières
ESLint que leur couche. Environnement `node` par défaut ; un test
de présentation passe en jsdom avec `// @vitest-environment jsdom` en tête.
`server-only` est neutralisé dans `vitest.setup.ts`. Vitest ne rend pas les
Server Components async : tester des composants synchrones.

## Couches

- Présentation : `app/` (points d'entrée Next) et `components/`.
- Service : `services/`, reçoit la couche données par injection
  (`createXService(store)`) pour être testé avec un faux, sans base.
- Données : `data/`, seul endroit autorisé pour le pilote.
- `services/` et `data/` commencent par `import "server-only"`.
- `eslint.config.mjs` fait appliquer ces frontières (`no-restricted-imports`) :
  `pnpm lint` échoue sur un import interdit entre couches.
- Règles détaillées par couche, chargées quand on touche ses fichiers :
  `.claude/rules/presentation.md`, `service.md`, `donnees.md`.

## Particularités de la stack

- Next.js 16.4 et React 19.3 sont plus récents que les données
  d'entraînement : lire le guide dans `node_modules/next/dist/docs/` avant
  d'écrire du code Next.
- `next.config.ts` active `cacheComponents` et `partialPrefetching` ; en
  tenir compte pour la lecture des données et le cache.
- Tailwind v4 passe par une règle de loader Turbopack sur `*.css`
  (`@tailwindcss/turbopack`), pas par PostCSS. Les jetons de thème sont dans
  `app/globals.css`, via `@theme inline`.
- Base : SQLite via Turso (`@libsql/client`, dans `data/` seulement).
  `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` ; sans URL hors production,
  base locale `.data/kanbazar.db` (ignorée par git), schéma migré à
  l'ouverture (table `schema_version`, `data/db.ts` ; Turso refuse d'écrire `PRAGMA user_version`).
- Alias de chemin : `@/*` → racine du dépôt.
- `.env*` est ignoré par git ; les identifiants Turso vont là et dans les
  variables d'environnement Vercel.

## Commits

Messages de commit en français, préfixe de type Conventional Commits
(`chore: …`, `feat: …`, `fix: …`), comme dans l'historique.
