"use client";

import { LayoutDashboard } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { CardStatus } from "@/services/card-service";
import { columns } from "./columns";
import { Logo } from "./logo";
import { NewCardButton } from "./new-card-button";
import { SaveStatus } from "./save-status";

type AppSidebarProps = { counts: Record<CardStatus, number> };

export function AppSidebar({ counts }: AppSidebarProps) {
  const total = counts.todo + counts.doing + counts.done;
  return (
    <Sidebar aria-label="Menu principal">
      <SidebarHeader className="gap-5 px-3 pt-5">
        <Logo />
        <NewCardButton className="w-full" />
      </SidebarHeader>
      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive size="lg" render={<a href="#board" aria-current="page" />}>
                <LayoutDashboard aria-hidden="true" />
                Tableau
                <span className="ml-auto font-mono text-xs text-muted-foreground">{total}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Colonnes</SidebarGroupLabel>
          <SidebarMenu>
            {columns.map((column) => (
              <SidebarMenuItem key={column.status}>
                <SidebarMenuButton size="lg" render={<a href={`#col-${column.status}`} />}>
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${column.dotClass}`} />
                  {column.title}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{counts[column.status]}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <SaveStatus />
      </SidebarFooter>
    </Sidebar>
  );
}
