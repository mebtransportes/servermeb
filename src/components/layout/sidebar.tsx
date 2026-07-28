"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { useSidebar } from "@/components/layout/sidebar-context";
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
  type NavLink,
} from "@/lib/nav-config";

const SIDEBAR_BG = "bg-[#33388d]";
const SIDEBAR_BORDER = "border-[#2a2f7a]";

function navItemClass(active: boolean, collapsed: boolean) {
  return cn(
    "flex items-center rounded-lg text-sm font-medium transition",
    collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
    active
      ? "bg-white text-[#33388d] shadow-sm"
      : "text-white/85 hover:bg-white/10 hover:text-white"
  );
}

function NavGroupItem({
  group,
  pathname,
  open,
  onToggle,
  collapsed,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
}) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isActive = pathname.startsWith(group.prefix);

  useEffect(() => {
    if (!flyoutOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [flyoutOpen]);

  useEffect(() => {
    setFlyoutOpen(false);
  }, [pathname]);

  if (collapsed) {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          title={group.label}
          onClick={() => setFlyoutOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-center rounded-lg p-3 text-sm font-medium transition",
            isActive || flyoutOpen
              ? "bg-white/20 text-white"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          )}
        >
          <group.icon className="h-6 w-6 shrink-0" />
        </button>
        {flyoutOpen && (
          <div
            className={cn(
              "absolute left-full top-0 z-50 ml-2 min-w-[12.5rem] rounded-xl border p-2 shadow-xl",
              SIDEBAR_BG,
              SIDEBAR_BORDER
            )}
          >
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.children.map((child) => {
                const active = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setFlyoutOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-white text-[#33388d] font-medium shadow-sm"
                        : "text-white/85 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

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

function NavLinkItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavLink;
  pathname: string;
  collapsed: boolean;
}) {
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={navItemClass(active, collapsed)}
    >
      <item.icon className={cn("shrink-0", collapsed ? "h-6 w-6" : "h-5 w-5")} />
      {!collapsed && item.label}
    </Link>
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
  const { collapsed, hovered, isDashboard, setHovered } = useSidebar();
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

  const asideClass = cn(
    "flex h-full flex-col border-r transition-[width] duration-200 ease-in-out",
    collapsed ? "w-20 overflow-visible" : "w-64 overflow-hidden",
    !isDashboard && hovered && "shadow-2xl",
    SIDEBAR_BG,
    SIDEBAR_BORDER
  );

  const userInitial = (username.trim()[0] ?? "?").toUpperCase();

  const sidebarBody = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border-b",
          collapsed ? "px-2 py-5" : "px-3 py-5",
          SIDEBAR_BG,
          SIDEBAR_BORDER
        )}
      >
        <Logo
          variant={collapsed ? "sidebarIcon" : "sidebar"}
          linked
          homeHref={homeHref}
          className={collapsed ? "h-12 w-12" : undefined}
        />
      </div>

      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          collapsed ? "overflow-visible px-2 py-2" : "overflow-x-hidden overflow-y-auto p-3",
          SIDEBAR_BG
        )}
      >
        <div className={cn(collapsed ? "space-y-1.5" : "space-y-1")}>
          {nav.map((item: NavItem) => {
            if (isGroup(item)) {
              return (
                <NavGroupItem
                  key={item.label}
                  group={item}
                  pathname={pathname}
                  open={!!openGroups[item.label]}
                  onToggle={() => toggleGroup(item.label)}
                  collapsed={collapsed}
                />
              );
            }

            return (
              <NavLinkItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            );
          })}
        </div>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t",
          collapsed ? "space-y-2 p-2" : "space-y-1 p-3",
          SIDEBAR_BG,
          SIDEBAR_BORDER
        )}
      >
        <Link
          href="/perfil"
          title={collapsed ? "Minha conta" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm text-white/85 transition hover:bg-white/10 hover:text-white",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
            pathname === "/perfil" && "bg-white/20 text-white"
          )}
        >
          <UserCircle className={cn("shrink-0", collapsed ? "h-6 w-6" : "h-5 w-5")} />
          {!collapsed && "Minha conta"}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-sm text-red-200 transition hover:bg-red-500/20 hover:text-white",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && "Sair"}
        </button>
        {collapsed ? (
          <div
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[#33388d] shadow-sm"
            title={`@${username} · ${ROLE_LABELS[role as ProfileRole]}`}
          >
            {userInitial}
          </div>
        ) : (
          <>
            <p className="truncate px-3 pt-1 text-center text-xs text-white/60">@{username}</p>
            <p className="truncate px-3 pb-1 text-center text-[10px] uppercase tracking-wide text-white/45">
              {ROLE_LABELS[role as ProfileRole]}
            </p>
          </>
        )}
      </div>
    </>
  );

  if (isDashboard) {
    return <aside className={cn(asideClass, "w-64 shrink-0 overflow-hidden")}>{sidebarBody}</aside>;
  }

  return (
    <div className="relative h-full w-20 shrink-0">
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(asideClass, "absolute inset-y-0 left-0 z-40")}
      >
        {sidebarBody}
      </aside>
    </div>
  );
}
