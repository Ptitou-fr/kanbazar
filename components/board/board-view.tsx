"use client";

import { startTransition, useEffect, useOptimistic, useState, type DragEvent, type KeyboardEvent } from "react";
import { archiveCardAction } from "@/app/actions/archive-card";
import { deleteCardAction } from "@/app/actions/delete-card";
import { moveCardAction } from "@/app/actions/move-card";
import { Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { Board, CardStatus } from "@/services/card-service";
import { locateCard, moveCardInBoard, removeCardFromBoard, type Slot } from "./board-moves";
import { CardEditor } from "./card-editor";
import { CardItem } from "./card-item";
import { columns } from "./columns";
import { CreateCardForm } from "./create-card-form";
import { DeleteCardDialog } from "./delete-card-dialog";
import { notifySaveFailure } from "./save-failure";
import { useSaveStatus } from "./save-status";

const order: CardStatus[] = columns.map((column) => column.status);

function columnTitle(status: CardStatus) {
  return columns.find((column) => column.status === status)!.title;
}

function cardTitle(board: Board, id: string) {
  const slot = locateCard(board, id);
  return slot ? board[slot.status][slot.index].title : "";
}

// Glisser-déposer à la souris : la carte saisie et l'emplacement survolé.
type Drag = { id: string; over: Slot | null };
// Déplacement au clavier : la carte saisie et l'aperçu en cours (Échap revient au tableau enregistré).
type Grab = { id: string; preview: Board };

export function BoardView({ board }: { board: Board }) {
  // Le tableau enregistré, ou l'aperçu d'un déplacement en cours d'enregistrement.
  const [saved, setOptimisticBoard] = useOptimistic(board);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [grab, setGrab] = useState<Grab | null>(null);
  const [announce, setAnnounce] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { setState: setSaveState } = useSaveStatus();

  const shown = grab?.preview ?? saved;
  const findCard = (id: string | null) => (id ? Object.values(saved).flat().find((card) => card.id === id) : undefined);
  const editing = findCard(editingId);
  const deleting = findCard(deletingId);

  // Au clavier, la poignée garde le focus quand la carte change de colonne.
  const grabbedId = grab?.id;
  useEffect(() => {
    if (grabbedId) document.querySelector<HTMLElement>(`[data-handle="${grabbedId}"]`)?.focus();
  }, [grabbedId, shown]);

  // Affiche `next` tout de suite, puis enregistre. En cas d'échec, la
  // transition se termine sans nouveau tableau : l'aperçu disparaît et le
  // tableau enregistré revient.
  function saveBoard(next: Board, run: () => Promise<{ ok: boolean }>, failure: string, retry: () => void) {
    setSaveState("saving");
    startTransition(async () => {
      setOptimisticBoard(next);
      let ok = false;
      try {
        ok = (await run()).ok;
      } catch {
        ok = false;
      }
      if (ok) {
        setSaveState("saved");
        return;
      }
      setSaveState("error");
      setAnnounce(`Échec de l’enregistrement : ${failure}`);
      notifySaveFailure(failure, retry);
    });
  }

  function commitMove(id: string, status: CardStatus, index: number) {
    const from = locateCard(saved, id);
    if (!from || (from.status === status && from.index === index)) return;
    saveBoard(
      moveCardInBoard(saved, id, status, index),
      () => moveCardAction(id, status, index),
      `« ${cardTitle(saved, id)} » n’a pas été déplacée : elle revient à sa place.`,
      () => commitMove(id, status, index),
    );
  }

  function archive(id: string) {
    if (!locateCard(saved, id)) return;
    setEditingId(null);
    saveBoard(
      removeCardFromBoard(saved, id),
      () => archiveCardAction(id),
      `« ${cardTitle(saved, id)} » n’a pas été archivée : elle reste sur le tableau.`,
      () => archive(id),
    );
  }

  // Demande la confirmation ; la suppression se fait dans confirmDelete.
  function askToDelete(id: string) {
    setEditingId(null);
    setDeletingId(id);
  }

  function confirmDelete(id: string) {
    setDeletingId(null);
    if (!locateCard(saved, id)) return;
    saveBoard(
      removeCardFromBoard(saved, id),
      () => deleteCardAction(id),
      `« ${cardTitle(saved, id)} » n’a pas été supprimée : elle reste sur le tableau.`,
      () => confirmDelete(id),
    );
  }

  function describe(board: Board, id: string) {
    const slot = locateCard(board, id)!;
    return `colonne ${columnTitle(slot.status)}, position ${slot.index + 1} sur ${board[slot.status].length}`;
  }

  function onHandleKeyDown(id: string, event: KeyboardEvent) {
    const title = cardTitle(shown, id);
    const { key } = event;
    if (key === " " || key === "Enter") {
      event.preventDefault();
      if (grab?.id === id) {
        const slot = locateCard(grab.preview, id)!;
        setGrab(null);
        setAnnounce(
          `« ${title} » déposée dans ${columnTitle(slot.status)}, position ${slot.index + 1} sur ${grab.preview[slot.status].length}.`,
        );
        commitMove(id, slot.status, slot.index);
      } else {
        setGrab({ id, preview: saved });
        setAnnounce(`« ${title} » saisie. Flèches pour la déplacer, Espace pour la déposer, Échap pour annuler.`);
      }
      return;
    }
    if (grab?.id !== id) return;
    if (key === "Escape") {
      event.preventDefault();
      setGrab(null);
      setAnnounce("Déplacement annulé.");
      return;
    }
    const slot = locateCard(grab.preview, id)!;
    let target: Slot | null = null;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const status = order[order.indexOf(slot.status) + (key === "ArrowLeft" ? -1 : 1)];
      // Vers une autre colonne, la carte arrive en bas.
      if (status) target = { status, index: grab.preview[status].length };
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      const index = slot.index + (key === "ArrowUp" ? -1 : 1);
      if (index >= 0 && index < grab.preview[slot.status].length) target = { status: slot.status, index };
    }
    if (!target) return;
    event.preventDefault();
    const preview = moveCardInBoard(grab.preview, id, target.status, target.index);
    setGrab({ ...grab, preview });
    setAnnounce(`« ${title} » — ${describe(preview, id)}.`);
  }

  function setOver(over: Slot) {
    setDrag((current) =>
      current && (current.over?.status !== over.status || current.over.index !== over.index) ? { ...current, over } : current,
    );
  }

  function onDrop(event: DragEvent) {
    if (!drag) return;
    event.preventDefault();
    const { id, over } = drag;
    setDrag(null);
    if (!over) return;
    const title = cardTitle(saved, id);
    setAnnounce(`« ${title} » déposée dans ${columnTitle(over.status)}, position ${over.index + 1}.`);
    commitMove(id, over.status, over.index);
  }

  return (
    <>
      {grab && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-[14px] border border-ring bg-card px-4 py-3 ring-3 ring-ring/20">
          <p className="flex-[1_1_280px] text-sm">{announce}</p>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd> changer de colonne
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> changer de rang
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Espace</Kbd> déposer
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Échap</Kbd> annuler
            </span>
          </div>
        </div>
      )}
      <div className="grid snap-x snap-mandatory grid-cols-[repeat(3,minmax(272px,1fr))] items-start gap-4 overflow-x-auto pb-1">
        {columns.map((column) => {
          const cards = shown[column.status];
          const visible = drag ? cards.filter((card) => card.id !== drag.id) : cards;
          const overIndex = drag?.over?.status === column.status ? drag.over.index : null;
          const headingId = `col-${column.status}-title`;
          const placeholder = (
            <li key="placeholder" data-placeholder aria-hidden="true" className="h-22 rounded-xl border-[1.5px] border-dashed border-primary/60 bg-primary/5" />
          );
          return (
            <section
              key={column.status}
              id={`col-${column.status}`}
              aria-labelledby={headingId}
              className={cn(
                "flex min-h-[560px] snap-start flex-col gap-2.5 rounded-2xl border bg-muted p-3 transition-colors motion-reduce:transition-none",
                overIndex !== null && "border-primary/45 bg-primary/7",
              )}
              onDragOver={(event) => {
                if (!drag) return;
                event.preventDefault();
                // Sous les cartes ou dans le vide de la colonne : dépôt en bas.
                if ((event.target as Element).closest?.("[data-card], [data-placeholder]")) return;
                setOver({ status: column.status, index: visible.length });
              }}
              onDrop={onDrop}
            >
              <header className="flex items-center gap-2 px-1 py-0.5">
                <span aria-hidden="true" className={`size-2 rounded-full ${column.dotClass}`} />
                <h2 id={headingId} className="flex-1 text-sm font-semibold">
                  {column.title}
                </h2>
                <span className="rounded-full border bg-card px-2 py-1 font-mono text-xs leading-none text-muted-foreground">
                  {cards.length}
                </span>
              </header>
              <ol className="flex min-h-20 flex-col gap-2">
                {visible.map((card, index) => [
                  overIndex === index ? placeholder : null,
                  <li key={card.id}>
                    <CardItem
                      card={card}
                      grabbed={grab?.id === card.id}
                      onOpen={() => setEditingId(card.id)}
                      onArchive={() => archive(card.id)}
                      onDelete={() => askToDelete(card.id)}
                      onHandleKeyDown={(event) => onHandleKeyDown(card.id, event)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", card.id);
                        // Après la capture de l'image glissée : la carte laisse place à l'emplacement.
                        setTimeout(() => setDrag({ id: card.id, over: { status: column.status, index } }), 0);
                      }}
                      onDragEnd={() => setDrag(null)}
                      onDragOver={(event) => {
                        if (!drag) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        const after = event.clientY > rect.top + rect.height / 2;
                        setOver({ status: column.status, index: index + (after ? 1 : 0) });
                      }}
                    />
                  </li>,
                ])}
                {overIndex !== null && overIndex >= visible.length && placeholder}
                {/* La carte glissée reste dans le DOM, masquée, pour que le navigateur termine le glisser. */}
                {drag &&
                  cards
                    .filter((card) => card.id === drag.id)
                    .map((card) => (
                      <li key={card.id} hidden>
                        <CardItem
                          card={card}
                          grabbed={false}
                          onOpen={() => {}}
                          onArchive={() => {}}
                          onDelete={() => {}}
                          onHandleKeyDown={() => {}}
                          onDragEnd={() => setDrag(null)}
                        />
                      </li>
                    ))}
              </ol>
              {column.status === "todo" && <CreateCardForm />}
            </section>
          );
        })}
      </div>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {editing && (
        <CardEditor
          key={editing.id}
          card={editing}
          onClose={() => setEditingId(null)}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => archive(editing.id)}>
                <Archive aria-hidden="true" />
                Archiver
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => askToDelete(editing.id)}>
                <Trash2 aria-hidden="true" />
                Supprimer
              </Button>
            </>
          }
        />
      )}
      {deleting && <DeleteCardDialog card={deleting} onCancel={() => setDeletingId(null)} onConfirm={() => confirmDelete(deleting.id)} />}
    </>
  );
}
