import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  isValid,
} from "date-fns";

export type PeriodoFiltro = "hoje" | "semana" | "mes" | "ano" | "todos";

export const PERIODOS: { value: PeriodoFiltro; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
  { value: "todos", label: "Todos" },
];

export function getIntervalo(periodo: PeriodoFiltro): { start: Date; end: Date } | null {
  const now = new Date();
  switch (periodo) {
    case "hoje":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "semana":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "mes":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "ano":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return null;
  }
}

export function dataNoPeriodo(
  dateStr: string | Date,
  periodo: PeriodoFiltro
): boolean {
  if (periodo === "todos") return true;
  const intervalo = getIntervalo(periodo);
  if (!intervalo) return true;

  const d =
    typeof dateStr === "string"
      ? parseISO(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`)
      : dateStr;
  if (!isValid(d)) return false;
  return isWithinInterval(d, intervalo);
}

export function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
