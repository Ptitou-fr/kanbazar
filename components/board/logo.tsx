import { SquareKanban } from "lucide-react";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground">
        <SquareKanban className="size-[18px]" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Kanbazar</span>
    </span>
  );
}
