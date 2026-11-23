import { Card } from "@/components/ui/card";
import type { Card as CardData } from "@/services/card-service";

export function CardItem({ card }: { card: CardData }) {
  return (
    <Card size="sm" className="px-3 shadow-xs">
      <h3 className="text-sm leading-snug font-medium">{card.title}</h3>
    </Card>
  );
}
