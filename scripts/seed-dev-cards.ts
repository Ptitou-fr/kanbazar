// Crée une douzaine de cartes de développement sur un tableau vide.
//
//   pnpm seed:dev-cards
//
// Vise la base définie par TURSO_DATABASE_URL et TURSO_AUTH_TOKEN, lues dans
// .env.production.local. Passe par le service : les cartes suivent les mêmes
// règles que celles créées dans l'interface. Refuse de tourner si le tableau
// contient déjà des cartes, pour ne pas créer de doublons.

import { cardService, type CardStatus } from "@/services/card-service";

const cards: { title: string; description: string; status: CardStatus }[] = [
  { title: "Brancher la base Turso", description: "Client libsql dans data/, identifiants lus dans l’environnement.", status: "done" },
  { title: "Poser les trois couches", description: "Présentation, service, données, avec les frontières vérifiées par ESLint.", status: "done" },
  { title: "Appliquer le thème Menthe", description: "Tokens shadcn en clair et en sombre, contrastes vérifiés.", status: "done" },
  { title: "Protéger toutes les URL sur Vercel", description: "Vercel Authentication sur tous les déploiements, domaine de production compris.", status: "done" },
  { title: "Déployer à Portland", description: "Fonctions Vercel en pdx1, base Turso en aws-us-west-2.", status: "doing" },
  { title: "Glisser-déposer au doigt", description: "Le glisser-déposer natif ne marche pas sur mobile : évaluer une bibliothèque à pointeurs.", status: "doing" },
  { title: "Tester sur Firefox", description: "Vérifier le glisser-déposer depuis une carte dont le titre est un bouton.", status: "doing" },
  { title: "Migrations au démarrage", description: "Deux instances neuves peuvent migrer en même temps : mesurer le risque.", status: "todo" },
  { title: "Compteurs optimistes", description: "Les compteurs de la barre latérale attendent la réponse du serveur.", status: "todo" },
  { title: "Formulaire de création replié", description: "Cacher le formulaire derrière « Ajouter une carte », comme dans le canevas.", status: "todo" },
  { title: "Trier au doigt dans une colonne", description: "« Déplacer vers… » change de colonne mais ne change pas le rang.", status: "todo" },
  { title: "Écran des archives", description: "Hors périmètre de la première version : à rediscuter avec l’équipe.", status: "todo" },
];

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL manquante : renseigne .env.production.local.");
  }

  const board = await cardService.getBoard();
  const existing = board.todo.length + board.doing.length + board.done.length;
  if (existing > 0) {
    throw new Error(`Le tableau contient déjà ${existing} carte(s) : rien n’a été créé.`);
  }

  for (const { title, description, status } of cards) {
    const created = await cardService.createCard(title);
    if (!created.ok) throw new Error(`« ${title} » refusée : ${created.error}`);
    const updated = await cardService.updateCard(created.card.id, { description });
    if (!updated.ok) throw new Error(`Description de « ${title} » refusée : ${updated.error}`);
    if (status !== "todo") {
      // Au-delà de la colonne, la carte arrive en bas : l'ordre de la liste est gardé.
      const moved = await cardService.moveCard(created.card.id, status, Number.MAX_SAFE_INTEGER);
      if (!moved.ok) throw new Error(`Déplacement de « ${title} » refusé : ${moved.error}`);
    }
  }

  console.log(`${cards.length} cartes créées.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
