import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Card as CardData } from "@/services/card-service";

type CardItemProps = { card: CardData; onOpen: () => void };

export function CardItem({ card, onOpen }: CardItemProps) {
  return (
    <Card size="sm" className="relative gap-0.5 px-3 shadow-xs transition-shadow hover:ring-primary/35">
      <h3 className="text-sm leading-snug font-medium">
        {/* Toute la carte est cliquable (after:inset-0) et ouvre le panneau d'édition. */}
        <Button
          variant="ghost"
          onClick={onOpen}
          className="h-auto w-full justify-start rounded-none p-0 text-left text-sm leading-snug font-medium whitespace-normal after:absolute after:inset-0 after:rounded-xl hover:bg-transparent focus-visible:ring-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 dark:hover:bg-transparent"
        >
          {card.title}
        </Button>
      </h3>
      {card.description && <p className="line-clamp-2 text-[13px] leading-normal text-muted-foreground">{card.description}</p>}
    </Card>
  );
}
