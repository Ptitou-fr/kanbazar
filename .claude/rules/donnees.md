---
paths:
  - "data/**"
---

# Couche données

Concerne `data/`.

## Règles

- Seule couche qui parle à la base (SQLite via Turso). Le pilote, les
  requêtes, les migrations et un éventuel ORM restent dans `data/`.
- Exposer aux services des opérations et des types indépendants du moteur
  de stockage. Aucun type du pilote ne sort de `data/`, ni dans une
  signature, ni dans une valeur renvoyée.
- Aucune règle métier : la couche lit et écrit, les services décident.
- Ne dépend ni des services ni de la présentation.
- Exclusivement côté serveur : chaque fichier commence par
  `import "server-only"`. Les identifiants Turso viennent des variables
  d'environnement (`.env*` en local, Vercel en déployé), jamais du code.
- Changer de base ne doit modifier que `data/`, la configuration et la
  migration des données.

## Comment vérifier

```bash
pnpm lint
```
Les frontières ESLint échouent si `data/` importe un service ou la
présentation, ou si un fichier hors de `data/`, n'importe où dans le dépôt,
importe le pilote (`libsql`, `@libsql/*`, `@tursodatabase/*`, y compris en
`import type`). Un ORM choisi plus tard s'ajoute à `driverImports` dans
`eslint.config.mjs`.

```bash
grep -rnE "(from|import|import\(|require\()[[:space:]]*['\"](libsql|@libsql/|@tursodatabase/)" . --include='*.ts' --include='*.tsx' --include='*.mts' --include='*.js' --include='*.mjs' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=data
```
Ne doit rien afficher. Complète le lint, qui ne voit pas les `import()`
dynamiques ni les `require()`.

```bash
for f in data/*.ts; do head -1 "$f" | grep -q '^import "server-only";' || echo "sans server-only : $f"; done
```
Ne doit rien afficher.

```bash
pnpm test
```
