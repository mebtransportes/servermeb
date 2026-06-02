"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Truck,
  Wrench,
  ClipboardList,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Car,
  Users,
  Fuel,
  Building2,
  UserCircle,
  Package,
  LogOut,
  Settings,
  Route,
  MapPinned,
  FileText,
  Wallet,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";

type NavLink = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; icon: LucideIcon; prefix: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Operacional",
    icon: ClipboardList,
    prefix: "/operacional",
    children: [
      { href: "/operacional/viagens", label: "Cadastro de Viagens", icon: Route },
      { href: "/operacional/acompanhamento", label: "Acompanhamento", icon: MapPinned },
    ],
  },
  {
    label: "Frota",
    icon: Truck,
    prefix: "/frota",
    children: [
      { href: "/frota/manutencao", label: "Manutenção", icon: Wrench },
      { href: "/frota/documentacao", label: "Documentação", icon: FileText },
      { href: "/frota/abastecimentos", label: "Abastecimentos", icon: Fuel },
    ],
  },
  {
    label: "Cadastro",
    icon: Wrench,
    prefix: "/cadastro",
    children: [
      { href: "/cadastro/veiculos", label: "Veículos", icon: Car },
      { href: "/cadastro/motoristas", label: "Motoristas", icon: Users },
      { href: "/cadastro/postos", label: "Postos", icon: Fuel },
      { href: "/cadastro/oficinas", label: "Oficinas", icon: Building2 },
      { href: "/cadastro/clientes", label: "Clientes", icon: UserCircle },
      { href: "/cadastro/fornecedores", label: "Fornecedores", icon: Package },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    prefix: "/financeiro",
    children: [
      { href: "/financeiro", label: "Dashboard", icon: LayoutDashboard },
      { href: "/financeiro/custos-operacionais", label: "Custos Operacionais", icon: Fuel },
      { href: "/financeiro/custos-empresariais", label: "Custos Empresariais", icon: Building2 },
      { href: "/financeiro/fechamento-viagens", label: "Fechamento de Viagens", icon: Route },
      { href: "/financeiro/controle-gastos", label: "Controle de Gastos", icon: Wallet },
    ],
  },
];

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
          isActive ? "bg-cyan-600/20 text-cyan-300" : "text-slate-300 hover:bg-slate-800"
        )}
      >
        <group.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
          {group.children.map((child) => {
            const active = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    Operacional: pathname.startsWith("/operacional"),
    Frota: pathname.startsWith("/frota"),
    Cadastro: pathname.startsWith("/cadastro"),
    Financeiro: pathname.startsWith("/financeiro"),
  }));

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
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex min-h-[6.25rem] items-center justify-center border-b border-slate-800 bg-white px-2 py-3">
        <Logo variant="sidebar" linked />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainNav.map((item) => {
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
                active ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 p-3">
        <Link
          href="/perfil"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800",
            pathname === "/perfil" && "bg-slate-800 text-white"
          )}
        >
          <Settings className="h-5 w-5" />
          Minha conta
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/50"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
        <p className="truncate px-3 pt-2 text-center text-xs text-slate-500">
          @{username}
        </p>
      </div>
    </aside>
  );
}
