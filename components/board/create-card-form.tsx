"use client";

import { CircleAlert } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { createCardAction } from "@/app/actions/create-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NEW_CARD_INPUT_ID } from "./columns";
import { useSaveStatus } from "./save-status";

type FormError = "title_required" | "save_failed" | null;

export function CreateCardForm() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<FormError>(null);
  const [pending, startTransition] = useTransition();
  const { setState: setSaveState } = useSaveStatus();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("title_required");
      return;
    }
    const formData = new FormData();
    formData.set("title", title);
    setError(null);
    setSaveState("saving");
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createCardAction>>;
      try {
        result = await createCardAction(formData);
      } catch {
        result = { ok: false, error: "save_failed" };
      }
      if (result.ok) {
        setTitle("");
        setSaveState("saved");
      } else {
        setError(result.error);
        setSaveState(result.error === "save_failed" ? "error" : "saved");
      }
    });
  }

  const describedBy = error === "title_required" ? "new-card-error" : undefined;

  return (
    <form onSubmit={onSubmit} aria-label="Nouvelle carte" className="flex flex-col gap-2 rounded-xl border bg-card p-2.5" noValidate>
      <label htmlFor={NEW_CARD_INPUT_ID} className="sr-only">
        Titre de la nouvelle carte
      </label>
      <Input
        id={NEW_CARD_INPUT_ID}
        name="title"
        placeholder="Titre de la carte"
        autoComplete="off"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          if (error === "title_required") setError(null);
        }}
        aria-invalid={error === "title_required" || undefined}
        aria-describedby={describedBy}
      />
      {error === "title_required" && (
        <p id="new-card-error" className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert aria-hidden="true" className="size-3.5" />
          Le titre est obligatoire.
        </p>
      )}
      {error === "save_failed" && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5" />
          Échec de l’enregistrement : la carte n’a pas été ajoutée. Réessayez.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}
