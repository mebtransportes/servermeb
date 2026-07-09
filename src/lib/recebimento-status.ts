import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { normalizarDataPagamento } from "@/lib/viagem-pagamento-terceiro";
import type { RecebimentoStatus } from "@/types/recebimento";

function parseDataRecebimentoLocal(data: string): Date | null {
  const norm = normalizarDataPagamento(data);
  if (!norm) return null;
  const d = parseISO(`${norm}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True quando o dia de hoje é posterior à data de recebimento. */
export function dataRecebimentoVencida(
  dataRecebimento: string | null | undefined,
  hoje = new Date()
): boolean {
  if (!dataRecebimento?.trim()) return false;
  const venc = parseDataRecebimentoLocal(dataRecebimento);
  if (!venc) return false;
  return differenceInCalendarDays(startOfDay(hoje), venc) > 0;
}

/**
 * Pendente com data de recebimento já passada vira vencido.
 * Pago e demais status não são alterados automaticamente.
 */
export function resolverStatusRecebimento(
  status: RecebimentoStatus,
  dataRecebimento: string | null | undefined,
  hoje = new Date()
): RecebimentoStatus {
  if (status !== "pendente") return status;
  if (!dataRecebimentoVencida(dataRecebimento, hoje)) return status;
  return "vencido";
}
