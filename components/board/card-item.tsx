import { Archive, Ellipsis, GripVertical, Trash2 } from "lucide-react";
import type { DragEventHandler, KeyboardEventHandler } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Card as CardData, CardStatus } from "@/services/card-service";
import { columns } from "./columns";

// Au doigt, chaque entrée du menu fait au moins 44 px de haut ; à la souris, la taille shadcn.
const TOUCH_TARGET = "any-pointer-coarse:min-h-11";

type CardItemProps = {
  card: CardData;
  grabbed: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMoveTo: (status: CardStatus) => void;
  onHandleKeyDown: KeyboardEventHandler;
  onDragStart?: DragEventHandler;
  onDragEnd?: DragEventHandler;
  onDragOver?: DragEventHandler<HTMLDivElement>;
};

export function CardItem({ card, grabbed, onOpen, onArchive, onDelete, onMoveTo, onHandleKeyDown, onDragStart, onDragEnd, onDragOver }: CardItemProps) {
  return (
    <Card
      size="sm"
      data-card={card.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className={cn(
        "relative grid cursor-grab grid-cols-[auto_1fr_auto] gap-x-1.5 gap-y-0.5 py-2.5 pr-2 pl-1.5 shadow-xs transition-[box-shadow,translate] hover:ring-primary/35 motion-reduce:transition-none",
        grabbed && "-translate-y-0.5 shadow-lg ring-2 ring-ring hover:ring-ring",
      )}
    >
      {/* Poignée clavier : Espace pour saisir et déposer, flèches pour déplacer, Échap pour annuler. */}
      <Button
        variant="ghost"
        size="icon-sm"
        data-handle={card.id}
        aria-label={`Déplacer « ${card.title} »`}
        aria-pressed={grabbed}
        onKeyDown={onHandleKeyDown}
        className="relative z-10 row-span-2 h-9 w-7 cursor-grab rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <GripVertical aria-hidden="true" />
      </Button>
      <h3 className="pt-2 text-sm leading-snug font-medium">
        {/* Toute la carte est cliquable (after:inset-0) et ouvre le panneau d'édition. */}
        <Button
          variant="ghost"
          onClick={onOpen}
          className="h-auto w-full justify-start rounded-none p-0 text-left text-sm leading-snug font-medium whitespace-normal after:absolute after:inset-0 after:rounded-xl hover:bg-transparent focus-visible:ring-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 dark:hover:bg-transparent"
        >
          {card.title}
        </Button>
      </h3>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions pour « ${card.title} »`}
              className="relative z-10 row-span-2 text-muted-foreground"
            />
          }
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {/* Sur écran tactile, le glisser-déposer natif ne marche pas : le menu le remplace. */}
          <div className="hidden any-pointer-coarse:block">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Déplacer vers…</DropdownMenuLabel>
              {columns
                .filter((column) => column.status !== card.status)
                .map((column) => (
                  <DropdownMenuItem key={column.status} className={TOUCH_TARGET} onClick={() => onMoveTo(column.status)}>
                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${column.dotClass}`} />
                    {column.title}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </div>
          <DropdownMenuItem className={TOUCH_TARGET} onClick={onArchive}>
            <Archive aria-hidden="true" />
            Archiver
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" className={TOUCH_TARGET} onClick={onDelete}>
            <Trash2 aria-hidden="true" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {card.description && <p className="col-start-2 line-clamp-2 text-[13px] leading-normal text-muted-foreground">{card.description}</p>}
    </Card>
  );
}
