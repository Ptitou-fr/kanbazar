---
paths:
  - "app/**"
  - "components/**"
---

# Couche présentation

Concerne `app/` (pages, layouts, Server Actions, Route Handlers) et
`components/`.

## Règles

- Lire ou modifier des données uniquement via `@/services/*`, y compris dans
  un Server Component. Jamais `@/data/*`, jamais le pilote de la base.
- Server Actions et Route Handlers sont des adaptateurs minces : ils
  convertissent la requête, appellent un service, convertissent la réponse.
  Aucune règle métier, aucune validation qui fait autorité.
- N'utiliser que les composants du design system : ceux de `components/ui/`
  (shadcn) et les composants qui les assemblent. Un composant manquant
  s'ajoute avec `pnpm dlx shadcn@latest add <nom>`, pas en HTML brut :
  aucun `<button>`, `<input>`, `<select>` ou `<textarea>` hors de
  `components/ui/`.
- Aucune couleur en dur : pas de hex, `rgb()`, `hsl()` ou `oklch()`, pas de
  classe de palette Tailwind (`bg-zinc-500`, `text-red-600`, `bg-white`…),
  pas de couleur dans `style`. Seulement les tokens du thème :
  `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`,
  `border-input`, `text-destructive`, etc.
- Les couleurs du thème (Menthe) se changent uniquement dans
  `app/globals.css`, en clair et en sombre, en gardant les contrastes
  (textes ≥ 4,5:1, bordure des champs ≥ 3:1).
- Afficher l'attente et l'erreur : un enregistrement qui échoue est signalé
  et n'est jamais présenté comme enregistré.

## Référence visuelle

- Le canevas [Kanbazar — maquette](https://claude.ai/artifact/1BSeZtNKtCjuhUqubGnsBD)
  est la référence des écrans. `lots.md` indique, pour chaque lot, les
  artboards à reproduire.
- Avant de coder un écran, lire ses artboards (`Artifact read`, chemin
  `project/<Nom>.dc.html`) et la feuille de style de la maquette :
  disposition, textes, états, comportement clavier.
- Les traduire en composants de `components/ui/` et en tokens, sans
  recopier le HTML ni le CSS de la maquette.
- Un écart volontaire avec le canevas est signalé dans la PR et, s'il est
  validé, reporté dans le canevas. Un changement de design passe d'abord par
  le canevas.

## Comment vérifier

```bash
pnpm lint
```
Les frontières ESLint échouent sur un import de `data/` ou du pilote.

```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b|(rgb|rgba|hsl|hsla|oklch)\(|\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|divide|accent|caret|decoration|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)\b" app components --include='*.ts' --include='*.tsx' --exclude-dir=ui
```
Ne doit rien afficher : aucune couleur en dur hors du design system.

```bash
grep -rnE "<(button|input|select|textarea)[[:space:]>/]" app components --include='*.tsx' --exclude-dir=ui
```
Ne doit rien afficher : aucun élément interactif brut hors `components/ui/`.

```bash
pnpm test
```

Comparer l'écran livré aux artboards du lot, en clair, en sombre et à 390 px
de large, par captures dans le navigateur intégré : même disposition, mêmes
textes, mêmes états.
