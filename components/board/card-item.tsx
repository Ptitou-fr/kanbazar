import { GripVertical } from "lucide-react";
import type { DragEventHandler, KeyboardEventHandler } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Card as CardData } from "@/services/card-service";

type CardItemProps = {
  card: CardData;
  grabbed: boolean;
  onOpen: () => void;
  onHandleKeyDown: KeyboardEventHandler;
  onDragStart?: DragEventHandler;
  onDragEnd?: DragEventHandler;
  onDragOver?: DragEventHandler<HTMLDivElement>;
};

export function CardItem({ card, grabbed, onOpen, onHandleKeyDown, onDragStart, onDragEnd, onDragOver }: CardItemProps) {
  return (
    <Card
      size="sm"
      data-card={card.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className={cn(
        "relative grid cursor-grab grid-cols-[auto_1fr] gap-x-1.5 gap-y-0.5 py-2.5 pr-3 pl-1.5 shadow-xs transition-[box-shadow,translate] hover:ring-primary/35 motion-reduce:transition-none",
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
      {card.description && <p className="col-start-2 line-clamp-2 text-[13px] leading-normal text-muted-foreground">{card.description}</p>}
    </Card>
  );
}
