"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import {
  getDefaultHome,
  ROLE_LABELS,
  type ProfileRole,
  type UserRole,
} from "@/lib/roles";
import {
  getInitialOpenGroups,
  getNavForRole,
  isGroup,
  type NavGroup,
  type NavItem,
} from "@/lib/nav-config";

const SIDEBAR_BG = "bg-[#33388d]";
const SIDEBAR_BORDER = "border-[#2a2f7a]";

function NavGroupItem({
  group,
  pathname,
  open,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const isActive = pathname.startsWith(group.prefix);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "bg-white/20 text-white"
            : "text-white/85 hover:bg-white/10 hover:text-white"
        )}
      >
        <group.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-white/25 pl-3">
          {group.children.map((child) => {
            const active = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-white text-[#33388d] shadow-sm font-medium"
                    : "text-white/80 hover:bg-white/15 hover:text-white"
                )}
              >
                <child.icon className="h-4 w-4" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  username,
  role,
}: {
  username: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = getNavForRole(role);
  const homeHref = getDefaultHome(role);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getInitialOpenGroups(pathname, nav)
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col border-r",
        SIDEBAR_BG,
        SIDEBAR_BORDER
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center border-b px-3 py-5",
          SIDEBAR_BG,
          SIDEBAR_BORDER
        )}
      >
        <Logo variant="sidebar" linked homeHref={homeHref} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item: NavItem) => {
          if (isGroup(item)) {
            return (
              <NavGroupItem
                key={item.label}
                group={item}
                pathname={pathname}
                open={!!openGroups[item.label]}
                onToggle={() => toggleGroup(item.label)}
              />
            );
          }

          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white text-[#33388d] shadow-sm"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-1 border-t p-3", SIDEBAR_BG, SIDEBAR_BORDER)}>
        <Link
          href="/perfil"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10 hover:text-white",
            pathname === "/perfil" && "bg-white/20 text-white"
          )}
        >
          <Settings className="h-5 w-5" />
          Minha conta
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
        <p className="truncate px-3 pt-1 text-center text-xs text-white/60">
          @{username}
        </p>
        <p className="truncate px-3 pb-1 text-center text-[10px] uppercase tracking-wide text-white/45">
          {ROLE_LABELS[role as ProfileRole]}
        </p>
      </div>
    </aside>
  );
}
