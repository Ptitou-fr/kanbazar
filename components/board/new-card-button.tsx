"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { NEW_CARD_INPUT_ID } from "./columns";

// Amène le curseur dans le formulaire de création, en bas de « À faire ».
export function NewCardButton({ label = "Nouvelle carte", className }: { label?: string; className?: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      className={className}
      size="lg"
      onClick={() => {
        setOpenMobile(false);
        document.getElementById(NEW_CARD_INPUT_ID)?.focus();
      }}
    >
      <Plus aria-hidden="true" />
      {label}
    </Button>
  );
}
