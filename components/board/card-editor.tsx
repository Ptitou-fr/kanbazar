"use client";

import { CircleAlert, CircleCheck, LoaderCircle, X } from "lucide-react";
import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { updateCardAction, type UpdateCardState } from "@/app/actions/update-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Card } from "@/services/card-service";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, tooLongMessages } from "./columns";
import { notifySaveFailure } from "./save-failure";

type Field = "title" | "description";
type Values = Record<Field, string>;

// Attente avant d'enregistrer la description pendant la frappe.
const DESCRIPTION_DELAY_MS = 800;

const statusLabels = {
  saved: "Enregistré",
  saving: "Enregistrement…",
  error: "Échec de l’enregistrement",
} as const;

type CardEditorProps = { card: Card; onClose: () => void; actions?: ReactNode };

// Panneau « Modifier la carte » : chaque champ s'enregistre seul, en quittant
// le champ (et, pour la description, pendant la frappe). Pas de bouton
// « Enregistrer ».
export function CardEditor({ card, onClose, actions }: CardEditorProps) {
  const [values, setValues] = useState<Values>({ title: card.title, description: card.description });
  const [titleError, setTitleError] = useState<"title_required" | "title_too_long" | null>(null);
  const [descriptionError, setDescriptionError] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<Field>>(new Set());
  // Dernière valeur envoyée par champ : évite de renvoyer deux fois la même.
  const sent = useRef<Values>({ title: card.title, description: card.description });
  const savedTitle = useRef(card.title);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const status = pendingCount > 0 ? "saving" : failed.size > 0 ? "error" : "saved";

  function markFailed(field: Field, value: boolean) {
    setFailed((current) => {
      const next = new Set(current);
      if (value) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  function save(field: Field, value: string) {
    const previous = sent.current[field];
    sent.current[field] = value;
    setPendingCount((count) => count + 1);
    startTransition(async () => {
      let result: UpdateCardState;
      try {
        result = await updateCardAction(card.id, { [field]: value });
      } catch {
        result = { ok: false, error: "save_failed" };
      }
      setPendingCount((count) => count - 1);
      if (result.ok) {
        savedTitle.current = result.card.title;
        markFailed(field, false);
        return;
      }
      sent.current[field] = previous;
      // Refus du service sur le contenu : message sous le champ, pas d'échec d'enregistrement.
      if (result.error === "title_required" || result.error === "title_too_long") {
        setTitleError(result.error);
        return;
      }
      if (result.error === "description_too_long") {
        setDescriptionError(true);
        return;
      }
      markFailed(field, true);
      notifySaveFailure(`« ${savedTitle.current} » n’a pas été modifiée.`, () => save(field, value));
    });
  }

  function commit(field: Field, value: string, { quiet = false } = {}) {
    if (field === "title" && !value.trim()) {
      if (!quiet) setTitleError("title_required");
      return;
    }
    if (value.trim() === sent.current[field].trim()) return;
    save(field, value);
  }

  function commitDescriptionNow(value: string) {
    clearTimeout(timer.current);
    commit("description", value);
  }

  function close() {
    clearTimeout(timer.current);
    // Un titre vide n'est pas enregistré : l'ancien titre reste.
    commit("title", values.title, { quiet: true });
    commit("description", values.description);
    onClose();
  }

  const StatusIcon = status === "error" ? CircleAlert : status === "saving" ? LoaderCircle : CircleCheck;

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent showCloseButton={false} className="gap-[18px] p-6 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
        <div className="flex items-center gap-2.5">
          <SheetTitle className="flex-1 text-lg font-semibold tracking-tight">Modifier la carte</SheetTitle>
          <span
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full whitespace-nowrap bg-muted px-2.5 py-1.5 text-[12.5px] text-muted-foreground",
              status === "error" && "text-destructive",
            )}
          >
            <StatusIcon
              aria-hidden="true"
              className={cn("size-3.5", status === "saved" && "text-primary", status === "saving" && "animate-spin motion-reduce:animate-none")}
            />
            {statusLabels[status]}
          </span>
          <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Fermer" />}>
            <X aria-hidden="true" />
          </SheetClose>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-title" className="text-[13px]">
            Titre
          </Label>
          <Input
            id="edit-title"
            value={values.title}
            autoComplete="off"
            onChange={(event) => {
              setValues((current) => ({ ...current, title: event.target.value }));
              if (titleError && event.target.value.trim()) setTitleError(null);
            }}
            onBlur={(event) => commit("title", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit("title", event.currentTarget.value);
            }}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "edit-title-error" : undefined}
          />
          {titleError && (
            <p id="edit-title-error" className="flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert aria-hidden="true" className="size-3.5" />
              {titleError === "title_too_long" ? tooLongMessages.title_too_long : "Le titre est obligatoire."}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-description" className="text-[13px]">
            Description
          </Label>
          <Textarea
            id="edit-description"
            rows={6}
            value={values.description}
            className="min-h-33 resize-y [field-sizing:fixed]"
            maxLength={DESCRIPTION_MAX_LENGTH}
            aria-invalid={descriptionError || undefined}
            aria-describedby={descriptionError ? "edit-description-error" : undefined}
            onChange={(event) => {
              const value = event.target.value;
              setValues((current) => ({ ...current, description: value }));
              setDescriptionError(false);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => commit("description", value), DESCRIPTION_DELAY_MS);
            }}
            onBlur={(event) => commitDescriptionNow(event.target.value)}
          />
          {descriptionError && (
            <p id="edit-description-error" className="flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert aria-hidden="true" className="size-3.5" />
              {tooLongMessages.description_too_long}
            </p>
          )}
        </div>

        <p className="text-[12.5px] text-muted-foreground">Les modifications s’enregistrent automatiquement.</p>

        {actions && <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">{actions}</div>}
      </SheetContent>
    </Sheet>
  );
}
