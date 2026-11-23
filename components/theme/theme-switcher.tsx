"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ThemePreference } from "./theme";
import { useTheme } from "./theme-provider";

const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
  { value: "system", label: "Système", Icon: Monitor },
];

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <ToggleGroup
      aria-label="Thème"
      variant="outline"
      className="w-full"
      value={[preference]}
      onValueChange={(value: string[]) => {
        // Un clic sur le bouton déjà choisi le décoche : on garde le choix courant.
        const next = value[0] as ThemePreference | undefined;
        if (next) setPreference(next);
      }}
    >
      {options.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label} className="flex-1 gap-1.5 text-xs">
          <Icon aria-hidden="true" />
          <span aria-hidden="true">{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
