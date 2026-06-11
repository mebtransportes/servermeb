import { createClient } from "@/lib/supabase/client";
import type { ManutencaoParcela, ManutencaoParcelaInput } from "@/lib/manutencao-pagamento";
import { parseBrNumber } from "@/lib/number-format";
import type { ManutencaoPagamentoForma, ManutencaoPagamentoModalidade } from "@/lib/manutencao-pagamento";

export async function salvarParcelasManutencao(
  manutencaoId: string,
  parcelas: ManutencaoParcelaInput[]
) {
  const supabase = createClient();
  await supabase.from("frota_manutencao_parcelas").delete().eq("manutencao_id", manutencaoId);

  const rows = parcelas
    .map((p) => ({
      manutencao_id: manutencaoId,
      numero: p.numero,
      valor: parseBrNumber(p.valor) ?? 0,
      data_vencimento: p.dataVencimento,
    }))
    .filter((p) => p.data_vencimento && p.valor > 0);

  if (rows.length) {
    const { error } = await supabase.from("frota_manutencao_parcelas").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function carregarParcelasManutencao(
  manutencaoId: string
): Promise<ManutencaoParcela[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("frota_manutencao_parcelas")
    .select("numero, valor, data_vencimento")
    .eq("manutencao_id", manutencaoId)
    .order("numero");

  return (data ?? []).map((p) => ({
    numero: p.numero,
    valor: Number(p.valor) || 0,
    dataVencimento: p.data_vencimento,
  }));
}

export type PagamentoManutencaoPayload = {
  pagamento_modalidade: ManutencaoPagamentoModalidade | null;
  pagamento_forma: ManutencaoPagamentoForma | null;
  pagamento_vencimento: string | null;
};

export function montarPayloadPagamento(opts: {
  modalidade: ManutencaoPagamentoModalidade;
  forma: ManutencaoPagamentoForma;
  vencimentoAvista: string;
}): PagamentoManutencaoPayload {
  if (opts.modalidade === "A_VISTA") {
    return {
      pagamento_modalidade: opts.modalidade,
      pagamento_forma: opts.forma,
      pagamento_vencimento: opts.vencimentoAvista || null,
    };
  }
  return {
    pagamento_modalidade: opts.modalidade,
    pagamento_forma: opts.forma,
    pagamento_vencimento: null,
  };
}
