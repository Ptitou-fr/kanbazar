"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { OPEN_NEW_CARD_EVENT } from "./columns";

// Ouvre le formulaire de création, en bas de « À faire », et y place le curseur.
export function NewCardButton({ label = "Nouvelle carte", className }: { label?: string; className?: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      className={className}
      size="lg"
      onClick={() => {
        setOpenMobile(false);
        window.dispatchEvent(new Event(OPEN_NEW_CARD_EVENT));
      }}
    >
      <Plus aria-hidden="true" />
      {label}
    </Button>
  );
}
