import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { normalizarDataVencimento } from "@/lib/documentacao-alertas";
import type { ManutencaoCard } from "@/types/frota";

export type StatusAlertaManutencao = "atrasado" | "hoje" | "amanha";

export type AlertaManutencaoPreventiva = {
  id: string;
  frotaId: string;
  nome: string;
  veiculoId?: string | null;
  veiculoPlaca?: string;
  dataUltimaManutencao: string;
  dataPrevista: string;
  status: StatusAlertaManutencao;
  diasRestantes: number;
};

function parseDataLocal(iso: string): Date {
  const norm = normalizarDataVencimento(iso);
  if (!norm) return new Date(NaN);
  return parseISO(`${norm}T12:00:00`);
}

function chaveGrupo(item: ManutencaoCard): string {
  const veiculo = item.veiculoId ?? item.veiculoPlaca ?? "sem-veiculo";
  return `${veiculo}|${item.nome.trim().toLowerCase()}`;
}

export function statusAlertaManutencao(
  dataPrevista: string,
  hoje = new Date()
): { status: StatusAlertaManutencao; diasRestantes: number } | null {
  const norm = normalizarDataVencimento(dataPrevista);
  if (!norm) return null;
  const dias = differenceInCalendarDays(parseDataLocal(norm), startOfDay(hoje));
  if (dias < 0) return { status: "atrasado", diasRestantes: dias };
  if (dias === 0) return { status: "hoje", diasRestantes: 0 };
  if (dias === 1) return { status: "amanha", diasRestantes: 1 };
  return null;
}

export function montarAlertasManutencao(
  itens: ManutencaoCard[],
  hoje = new Date()
): AlertaManutencaoPreventiva[] {
  const preventivas = itens.filter((i) => i.source === "preventiva");
  const grupos = new Map<string, ManutencaoCard[]>();

  for (const item of preventivas) {
    const key = chaveGrupo(item);
    const lista = grupos.get(key) ?? [];
    lista.push(item);
    grupos.set(key, lista);
  }

  const alertas: AlertaManutencaoPreventiva[] = [];

  for (const grupo of grupos.values()) {
    const ordenado = grupo.slice().sort((a, b) => b.dataRef.localeCompare(a.dataRef));

    const referencia =
      ordenado.find((i) => i.dataProximaManutencao && i.status === "FINALIZADO") ??
      ordenado.find((i) => i.dataProximaManutencao);

    if (!referencia?.dataProximaManutencao || !referencia.frotaId) continue;

    const dataPrevista = normalizarDataVencimento(referencia.dataProximaManutencao);
    if (!dataPrevista) continue;

    const jaAtendido = ordenado.some(
      (i) =>
        i.frotaId !== referencia.frotaId &&
        i.dataRef >= dataPrevista
    );
    if (jaAtendido) continue;

    const situacao = statusAlertaManutencao(dataPrevista, hoje);
    if (!situacao) continue;

    alertas.push({
      id: `alerta-${referencia.frotaId}`,
      frotaId: referencia.frotaId,
      nome: referencia.nome,
      veiculoId: referencia.veiculoId,
      veiculoPlaca: referencia.veiculoPlaca,
      dataUltimaManutencao: referencia.dataRef,
      dataPrevista,
      status: situacao.status,
      diasRestantes: situacao.diasRestantes,
    });
  }

  const ordem: Record<StatusAlertaManutencao, number> = {
    atrasado: 0,
    hoje: 1,
    amanha: 2,
  };

  return alertas.sort((a, b) => {
    const sa = ordem[a.status];
    const sb = ordem[b.status];
    if (sa !== sb) return sa - sb;
    return a.dataPrevista.localeCompare(b.dataPrevista);
  });
}

export function resumoAlertasManutencao(alertas: AlertaManutencaoPreventiva[]) {
  return {
    total: alertas.length,
    atrasados: alertas.filter((a) => a.status === "atrasado").length,
    hoje: alertas.filter((a) => a.status === "hoje").length,
    amanha: alertas.filter((a) => a.status === "amanha").length,
  };
}

export function labelStatusAlertaManutencao(status: StatusAlertaManutencao): string {
  if (status === "atrasado") return "Em atraso";
  if (status === "hoje") return "Vence hoje";
  return "Vence amanhã";
}
