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
```

Aucun lanceur de tests n'est encore installé ; son choix reste ouvert.

## Particularités de la stack

- Next.js 16.4 et React 19.3 sont plus récents que les données
  d'entraînement : lire le guide dans `node_modules/next/dist/docs/` avant
  d'écrire du code Next.
- `next.config.ts` active `cacheComponents` et `partialPrefetching` ; en
  tenir compte pour la lecture des données et le cache.
- Tailwind v4 passe par une règle de loader Turbopack sur `*.css`
  (`@tailwindcss/turbopack`), pas par PostCSS. Les jetons de thème sont dans
  `app/globals.css`, via `@theme inline`.
- Imposés mais pas encore installés : shadcn/ui, SQLite via Turso.
- Alias de chemin : `@/*` → racine du dépôt.
- `.env*` est ignoré par git ; les identifiants Turso vont là et dans les
  variables d'environnement Vercel.

## Commits

Messages de commit en français, préfixe de type Conventional Commits
(`chore: …`, `feat: …`, `fix: …`), comme dans l'historique.
