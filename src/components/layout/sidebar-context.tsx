"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SidebarContextValue = {
  collapsed: boolean;
  hovered: boolean;
  isDashboard: boolean;
  setHovered: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const isDashboard = pathname === "/dashboard";
  const collapsed = !isDashboard && !hovered;

  useEffect(() => {
    if (isDashboard) setHovered(false);
  }, [isDashboard]);

  return (
    <SidebarContext.Provider value={{ collapsed, hovered, isDashboard, setHovered }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar deve ser usado dentro de SidebarProvider");
  }
  return ctx;
}
