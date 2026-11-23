import type { CardStatus } from "@/services/card-service";

export const columns: { status: CardStatus; title: string; dotClass: string }[] = [
  { status: "todo", title: "À faire", dotClass: "bg-muted-foreground" },
  { status: "doing", title: "En cours", dotClass: "bg-accent-foreground" },
  { status: "done", title: "Terminé", dotClass: "bg-primary" },
];

export const NEW_CARD_INPUT_ID = "new-card-title";

// Ouvre le formulaire de création replié (bouton « Nouvelle carte » de la barre latérale).
export const OPEN_NEW_CARD_EVENT = "kanbazar:open-new-card";

// Longueurs maximales pour la saisie. Le service fait autorité ; un test
// vérifie que ces valeurs restent les siennes (services/card-service.ts).
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 10_000;

export const tooLongMessages = {
  title_too_long: `Le titre ne doit pas dépasser ${TITLE_MAX_LENGTH} caractères.`,
  description_too_long: `La description ne doit pas dépasser ${DESCRIPTION_MAX_LENGTH.toLocaleString("fr-FR")} caractères.`,
} as const;
