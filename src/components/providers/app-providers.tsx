"use client";

import { MebDialogProvider } from "@/components/ui/meb-dialog";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <MebDialogProvider>{children}</MebDialogProvider>;
}
