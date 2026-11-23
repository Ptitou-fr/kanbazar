"use client";

import { CircleAlert, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createCardAction } from "@/app/actions/create-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DESCRIPTION_MAX_LENGTH, NEW_CARD_INPUT_ID, OPEN_NEW_CARD_EVENT, TITLE_MAX_LENGTH, tooLongMessages } from "./columns";

type FormError = "title_required" | "title_too_long" | "description_too_long" | "save_failed" | null;

// Formulaire de création, replié derrière « Ajouter une carte » en bas de
// « À faire ». Une fois ouvert, il reste ouvert après chaque ajout pour
// enchaîner les cartes ; « Annuler » ou Échap le referment.
export function CreateCardForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<FormError>(null);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Où remettre le focus au prochain rendu : le titre à l'ouverture, le bouton à la fermeture.
  const focusNext = useRef<"title" | "toggle" | null>(null);

  useEffect(() => {
    const onOpen = () => {
      focusNext.current = "title";
      setOpen(true);
      titleRef.current?.focus();
    };
    window.addEventListener(OPEN_NEW_CARD_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NEW_CARD_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (focusNext.current === "title") titleRef.current?.focus();
    if (focusNext.current === "toggle") toggleRef.current?.focus();
    focusNext.current = null;
  }, [open]);

  function show() {
    focusNext.current = "title";
    setOpen(true);
  }

  function close() {
    setTitle("");
    setDescription("");
    setError(null);
    focusNext.current = "toggle";
    setOpen(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("title_required");
      return;
    }
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createCardAction>>;
      try {
        result = await createCardAction(formData);
      } catch {
        result = { ok: false, error: "save_failed" };
      }
      if (result.ok) {
        setTitle("");
        setDescription("");
        titleRef.current?.focus();
      } else {
        const known = ["title_required", "title_too_long", "description_too_long"] as const;
        setError(known.find((error) => error === result.error) ?? "save_failed");
      }
    });
  }

  if (!open) {
    return (
      <Button
        ref={toggleRef}
        variant="ghost"
        size="sm"
        className="w-full justify-start rounded-xl text-muted-foreground hover:text-foreground"
        onClick={show}
      >
        <Plus aria-hidden="true" />
        Ajouter une carte
      </Button>
    );
  }

  const titleError = error === "title_required" || error === "title_too_long";
  const describedBy = titleError ? "new-card-error" : undefined;

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
      aria-label="Nouvelle carte"
      className="flex flex-col gap-2 rounded-xl border bg-card p-2.5"
      noValidate
    >
      <label htmlFor={NEW_CARD_INPUT_ID} className="sr-only">
        Titre de la nouvelle carte
      </label>
      <Input
        ref={titleRef}
        id={NEW_CARD_INPUT_ID}
        name="title"
        placeholder="Titre de la carte"
        autoComplete="off"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          if (titleError) setError(null);
        }}
        maxLength={TITLE_MAX_LENGTH}
        aria-invalid={titleError || undefined}
        aria-describedby={describedBy}
      />
      {titleError && (
        <p id="new-card-error" className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert aria-hidden="true" className="size-3.5" />
          {error === "title_too_long" ? tooLongMessages.title_too_long : "Le titre est obligatoire."}
        </p>
      )}
      <label htmlFor="new-card-description" className="sr-only">
        Description de la nouvelle carte
      </label>
      <Textarea
        id="new-card-description"
        name="description"
        placeholder="Description (facultative)"
        rows={3}
        maxLength={DESCRIPTION_MAX_LENGTH}
        value={description}
        onChange={(event) => {
          setDescription(event.target.value);
          if (error === "description_too_long") setError(null);
        }}
        aria-invalid={error === "description_too_long" || undefined}
        aria-describedby={error === "description_too_long" ? "new-card-description-error" : undefined}
      />
      {error === "description_too_long" && (
        <p id="new-card-description-error" className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert aria-hidden="true" className="size-3.5" />
          {tooLongMessages.description_too_long}
        </p>
      )}
      {error === "save_failed" && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5" />
          Échec de l’enregistrement : la carte n’a pas été ajoutée. Réessayez.
        </p>
      )}
      {/* Disposition habituelle : « Annuler », puis l'action principale à l'extrême droite. */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}
