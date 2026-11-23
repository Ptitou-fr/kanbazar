"use client";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Card } from "@/services/card-service";

type DeleteCardDialogProps = { card: Card; onCancel: () => void; onConfirm: () => void };

// Confirmation de la suppression définitive, qui propose d'archiver à la place.
export function DeleteCardDialog({ card, onCancel, onConfirm }: DeleteCardDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 aria-hidden="true" className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg font-semibold tracking-tight">Supprimer cette carte ?</AlertDialogTitle>
          <AlertDialogDescription>
            « {card.title} » sera effacée définitivement. Pour la retirer du tableau sans la perdre, archivez-la plutôt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
