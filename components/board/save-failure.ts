import { toast } from "sonner";

// Un échec reste affiché le temps de lire le message et de réessayer.
const FAILURE_TOAST_MS = 10_000;

export function notifySaveFailure(description: string, retry: () => void) {
  toast.error("Échec de l’enregistrement", {
    description,
    duration: FAILURE_TOAST_MS,
    action: { label: "Réessayer", onClick: retry },
  });
}
