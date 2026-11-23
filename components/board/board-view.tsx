import type { Board } from "@/services/card-service";
import { CardItem } from "./card-item";
import { columns } from "./columns";
import { CreateCardForm } from "./create-card-form";

export function BoardView({ board }: { board: Board }) {
  return (
    <div className="grid snap-x snap-mandatory grid-cols-[repeat(3,minmax(272px,1fr))] items-start gap-4 overflow-x-auto pb-1">
      {columns.map((column) => {
        const cards = board[column.status];
        const headingId = `col-${column.status}-title`;
        return (
          <section
            key={column.status}
            id={`col-${column.status}`}
            aria-labelledby={headingId}
            className="flex min-h-[560px] snap-start flex-col gap-2.5 rounded-2xl border bg-muted p-3"
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
            <ol className="flex flex-col gap-2">
              {cards.map((card) => (
                <li key={card.id}>
                  <CardItem card={card} />
                </li>
              ))}
            </ol>
            {column.status === "todo" && <CreateCardForm />}
          </section>
        );
      })}
    </div>
  );
}
