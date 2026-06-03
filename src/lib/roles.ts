export type ProfileRole = "admin" | "mecanico" | "inativo";

/** Perfis com acesso ao sistema (logados). */
export type UserRole = "admin" | "mecanico";

export const ROLE_LABELS: Record<ProfileRole, string> = {
  admin: "Administrador",
  mecanico: "Mecânico",
  inativo: "Inativo",
};

export const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "mecanico", label: ROLE_LABELS.mecanico },
  { value: "inativo", label: ROLE_LABELS.inativo },
];

export function normalizeProfileRole(value: string | null | undefined): ProfileRole {
  if (value === "mecanico") return "mecanico";
  if (value === "inativo") return "inativo";
  return "admin";
}

/** Compatível com sessões antigas — inativo não é UserRole. */
export function normalizeRole(value: string | null | undefined): UserRole {
  return normalizeProfileRole(value) === "mecanico" ? "mecanico" : "admin";
}

export function isActiveProfileRole(role: ProfileRole): role is UserRole {
  return role === "admin" || role === "mecanico";
}

export function getDefaultHome(role: UserRole): string {
  return role === "mecanico" ? "/frota/manutencao" : "/dashboard";
}

const MECANICO_ALLOWED: { type: "exact" | "prefix"; path: string }[] = [
  { type: "prefix", path: "/frota" },
  { type: "prefix", path: "/cadastro/postos" },
  { type: "prefix", path: "/cadastro/oficinas" },
  { type: "prefix", path: "/financeiro/custos-operacionais" },
  { type: "exact", path: "/perfil" },
];

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true;

  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";

  return MECANICO_ALLOWED.some((rule) => {
    if (rule.type === "exact") return path === rule.path;
    return path === rule.path || path.startsWith(`${rule.path}/`);
  });
}

export function isNavHrefAllowed(role: UserRole, href: string): boolean {
  return canAccessPath(role, href);
}
