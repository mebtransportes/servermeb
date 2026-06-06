import {
  LayoutDashboard,
  Truck,
  Wrench,
  ClipboardList,
  DollarSign,
  Car,
  Users,
  Fuel,
  Building2,
  UserCircle,
  Package,
  Route,
  MapPinned,
  FileText,
  Settings,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import { isNavHrefAllowed, type UserRole } from "@/lib/roles";

export type NavLink = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; icon: LucideIcon; prefix: string; children: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const mainNavAll: NavItem[] = [
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
      { href: "/financeiro/recebimentos", label: "Recebimentos", icon: Banknote },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    prefix: "/configuracoes",
    children: [
      { href: "/configuracoes/usuarios", label: "Usuários", icon: Users },
    ],
  },
];

export function getNavForRole(role: UserRole): NavItem[] {
  if (role === "admin") return mainNavAll;

  const items: NavItem[] = [];

  for (const item of mainNavAll) {
    if (isGroup(item)) {
      const children = item.children.filter((c) => isNavHrefAllowed(role, c.href));
      if (children.length === 0) continue;
      items.push({ ...item, children });
    } else if (isNavHrefAllowed(role, item.href)) {
      items.push(item);
    }
  }

  return items;
}

export function getInitialOpenGroups(pathname: string, nav: NavItem[]): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  for (const item of nav) {
    if (isGroup(item)) {
      open[item.label] = pathname.startsWith(item.prefix);
    }
  }
  return open;
}
