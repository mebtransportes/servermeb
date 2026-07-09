import { normalizarDataVencimento } from "@/lib/documentacao-alertas";
import {
  statusAlertaManutencao,
  type StatusAlertaManutencao,
} from "@/lib/manutencao-alertas";
import { fetchManutencoes } from "@/lib/frota-data";
import type { ManutencaoCard } from "@/types/frota";

export type AvisoParcelaManutencao = {
  id: string;
  manutencaoCardId: string;
  frotaId: string;
  nome: string;
  veiculoPlaca?: string;
  parcelaNumero: number;
  parcelaValor: number;
  dataVencimento: string;
  status: Exclude<StatusAlertaManutencao, "atrasado">;
};

export function montarAvisosParcelasManutencao(
  itens: ManutencaoCard[],
  hoje = new Date()
): AvisoParcelaManutencao[] {
  const avisos: AvisoParcelaManutencao[] = [];

  for (const item of itens) {
    if (item.source !== "preventiva" || item.pagamentoModalidade !== "A_PRAZO") continue;
    if (!item.frotaId || !item.parcelas?.length) continue;

    for (const parcela of item.parcelas) {
      const dataVenc = normalizarDataVencimento(parcela.dataVencimento);
      if (!dataVenc) continue;

      const situacao = statusAlertaManutencao(dataVenc, hoje);
      if (!situacao || situacao.status === "atrasado") continue;

      avisos.push({
        id: `${item.id}-parc-${parcela.numero}`,
        manutencaoCardId: item.id,
        frotaId: item.frotaId,
        nome: item.nome,
        veiculoPlaca: item.veiculoPlaca,
        parcelaNumero: parcela.numero,
        parcelaValor: parcela.valor,
        dataVencimento: dataVenc,
        status: situacao.status,
      });
    }
  }

  const ordem: Record<AvisoParcelaManutencao["status"], number> = {
    hoje: 0,
    amanha: 1,
  };

  return avisos.sort((a, b) => {
    const sa = ordem[a.status];
    const sb = ordem[b.status];
    if (sa !== sb) return sa - sb;
    if (a.dataVencimento !== b.dataVencimento) {
      return a.dataVencimento.localeCompare(b.dataVencimento);
    }
    return a.parcelaNumero - b.parcelaNumero;
  });
}

export function resumoAvisosParcelasManutencao(avisos: AvisoParcelaManutencao[]) {
  return {
    total: avisos.length,
    hoje: avisos.filter((a) => a.status === "hoje").length,
    amanha: avisos.filter((a) => a.status === "amanha").length,
  };
}

export function labelStatusParcelaManutencao(
  status: AvisoParcelaManutencao["status"]
): string {
  if (status === "hoje") return "Vence hoje";
  return "Vence amanhã";
}

export async function fetchAvisosParcelasManutencao(): Promise<AvisoParcelaManutencao[]> {
  const itens = await fetchManutencoes();
  return montarAvisosParcelasManutencao(itens);
}
