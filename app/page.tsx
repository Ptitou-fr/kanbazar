import { connection } from "next/server";
import { Suspense } from "react";
import { AppSidebar } from "@/components/board/app-sidebar";
import { BoardView } from "@/components/board/board-view";
import { Logo } from "@/components/board/logo";
import { NewCardButton } from "@/components/board/new-card-button";
import { SaveStatusProvider } from "@/components/board/save-status";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Kbd } from "@/components/ui/kbd";
import { Toaster } from "@/components/ui/sonner";
import { cardService } from "@/services/card-service";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Chargement du tableau…</p>}>
      <BoardPage />
    </Suspense>
  );
}

async function BoardPage() {
  // Le tableau est lu à chaque requête, jamais prérendu au build.
  await connection();
  const board = await cardService.getBoard();
  const counts = { todo: board.todo.length, doing: board.doing.length, done: board.done.length };
  const total = counts.todo + counts.doing + counts.done;

  return (
    <SaveStatusProvider>
      <SidebarProvider>
        <AppSidebar counts={counts} />
        <SidebarInset>
          <header className="flex min-h-14 items-center gap-2 border-b bg-sidebar px-3 md:hidden">
            <SidebarTrigger aria-label="Ouvrir le menu" />
            <span className="flex-1">
              <Logo />
            </span>
            <NewCardButton label="Carte" />
          </header>
          <div id="board" className="flex flex-col gap-5 p-4 md:px-8 md:pt-7 md:pb-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight md:text-[28px]">Tableau</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {total} {total > 1 ? "cartes actives" : "carte active"}
                </p>
              </div>
              <p className="hidden flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground md:flex">
                Glissez une carte pour la déplacer · au clavier : <Kbd>Espace</Kbd> puis <Kbd>←</Kbd>
                <Kbd>→</Kbd>
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </p>
            </div>
            <BoardView board={board} />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </SaveStatusProvider>
  );
}
