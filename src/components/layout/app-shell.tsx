"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { AppProviders } from "@/components/providers/app-providers";
import { RoleGuard } from "@/components/layout/role-guard";
import type { UserRole } from "@/lib/roles";

export function AppShell({
  username,
  role,
  children,
}: {
  username: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex h-screen overflow-hidden bg-white">
        <Sidebar username={username} role={role} />
        <main className="meb-app-main min-h-0 min-w-0 flex-1 overflow-y-auto p-4 text-base lg:p-6">
          <AppProviders>
            <RoleGuard role={role}>{children}</RoleGuard>
          </AppProviders>
        </main>
      </div>
    </SidebarProvider>
  );
}
