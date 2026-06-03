"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath, getDefaultHome, type UserRole } from "@/lib/roles";

export function RoleGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessPath(role, pathname)) {
      router.replace(getDefaultHome(role));
    }
  }, [role, pathname, router]);

  if (!canAccessPath(role, pathname)) {
    return (
      <p className="text-slate-400">Redirecionando…</p>
    );
  }

  return <>{children}</>;
}
