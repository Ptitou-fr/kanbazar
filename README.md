This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Déployer

Production sur Vercel (projet `kanbazar`, équipe Ptitou), base SQLite sur Turso.
Vercel déploie `main` en production, et chaque autre branche poussée en prévisualisation.

- **Région** : fonctions en `pdx1` (Portland, `vercel.json`), base Turso en
  `aws-us-west-2` (Oregon), à côté.
- **Base** : une seule base Turso `kanbazar`, partagée par la production et les
  prévisualisations. Une prévisualisation modifie donc les vraies cartes.
  Le schéma se migre tout seul au premier accès (`PRAGMA user_version`, `data/db.ts`).
- **Variables** : `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`, type Sensitive,
  cibles Production et Preview. Sans elles, l'app refuse de démarrer en production.
- **Accès** : Vercel Authentication sur **All Deployments** (Settings ›
  Deployment Protection). Toutes les URL, domaine de production compris,
  demandent un compte Vercel ayant accès à l'équipe, pour les pages comme pour
  les Server Actions. Ne pas repasser en « Standard » : elle laisse les
  domaines personnalisés publics.

### Identifiants en local

`.env.production.local` (ignoré par git) contient l'URL et le jeton de la base
de production. `pnpm dev` ne le lit pas et garde `.data/kanbazar.db` ;
`pnpm build` puis `pnpm start` le lisent.

### Cartes de dev

```bash
pnpm seed:dev-cards
```

Crée une douzaine de cartes de développement sur la base de
`.env.production.local`, en passant par le service. Refuse de tourner si le
tableau contient déjà des cartes.
