"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SaveState = "saved" | "saving" | "error";

const SaveStatusContext = createContext<{ state: SaveState; setState: (state: SaveState) => void }>({
  state: "saved",
  setState: () => {},
});

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>("saved");
  const value = useMemo(() => ({ state, setState }), [state]);
  return <SaveStatusContext.Provider value={value}>{children}</SaveStatusContext.Provider>;
}

export function useSaveStatus() {
  return useContext(SaveStatusContext);
}

const labels: Record<SaveState, string> = {
  saved: "Tout est enregistré",
  saving: "Enregistrement…",
  error: "Échec de l’enregistrement",
};

export function SaveStatus() {
  const { state } = useSaveStatus();
  const Icon = state === "error" ? CircleAlert : state === "saving" ? LoaderCircle : CircleCheck;
  return (
    <p
      role="status"
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground",
        state === "error" && "border-destructive/40 text-destructive",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4", state === "saved" && "text-primary", state === "saving" && "animate-spin motion-reduce:animate-none")}
      />
      {labels[state]}
    </p>
  );
}
