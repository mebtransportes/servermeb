import { createClient } from "@/lib/supabase/client";
import {
  fetchFornecedoresAcompanhamento,
  fetchViagensAcompanhamento,
  nomesFornecedoresViagem,
  viagemMatchFornecedor,
  type AcompanhamentoViagemItem,
} from "@/lib/acompanhamento-data";
import { dataNoIntervalo } from "@/lib/frota-filters";
import type { ParceiroSugestao } from "@/lib/parceiros";
import {
  type ViagemRecebimentoEncargo,
} from "@/types/recebimento";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";

export type RecebimentoViagemRelatorioLinha = {
  viagem_id: string;
  motorista_nome: string;
  numero_cte: string | null;
  placas: string;
  fornecedor: string;
  frete_bruto: number;
  descargas: number;
  diarias: number;
  data_recebimento: string | null;
  status_viagem: string;
  saida_em: string | null;
};

function dataReferenciaSaida(viagem: AcompanhamentoViagemItem): string {
  return viagem.saida_em ?? viagem.created_at;
}

function somaEncargosPorTipo(
  encargos: ViagemRecebimentoEncargo[],
  tipo: "descarga" | "diaria"
) {
  return encargos
    .filter((e) => e.tipo === tipo)
    .reduce((s, e) => s + (Number(e.valor) || 0), 0);
}

export function filtrarViagensRelatorioRecebimentos(
  viagens: AcompanhamentoViagemItem[],
  de: string,
  ate: string,
  fornecedor?: ParceiroSugestao | null
): AcompanhamentoViagemItem[] {
  return viagens.filter((v) => {
    const ref = dataReferenciaSaida(v);
    if (!dataNoIntervalo(ref, de, ate)) return false;
    if (fornecedor && !viagemMatchFornecedor(v, fornecedor)) return false;
    return true;
  });
}

export async function montarLinhasRelatorioTodasViagens(
  viagens: AcompanhamentoViagemItem[],
  fornecedores: ParceiroSugestao[]
): Promise<RecebimentoViagemRelatorioLinha[]> {
  if (!viagens.length) return [];

  const supabase = createClient();
  const ids = viagens.map((v) => v.id);

  const [{ data: recebimentos }, { data: viagensPagamento }] = await Promise.all([
    supabase
      .from("viagem_recebimentos")
      .select("id, viagem_id, valor_descargas_adicionais, valor_diarias, data_recebimento")
      .in("viagem_id", ids),
    supabase.from("viagens").select("id, data_pagamento").in("id", ids),
  ]);

  const recebimentoPorViagem = new Map(
    (recebimentos ?? []).map((r) => [r.viagem_id as string, r])
  );
  const dataPagamentoPorViagem = new Map(
    (viagensPagamento ?? []).map((v) => [
      v.id as string,
      (v.data_pagamento as string | null) ?? null,
    ])
  );

  const recebimentoIds = (recebimentos ?? []).map((r) => r.id);
  const encargosPorRecebimento = new Map<string, ViagemRecebimentoEncargo[]>();

  if (recebimentoIds.length) {
    const { data: encargosRows } = await supabase
      .from("viagem_recebimento_encargos")
      .select("recebimento_id, tipo, valor")
      .in("recebimento_id", recebimentoIds);

    for (const e of encargosRows ?? []) {
      const lista = encargosPorRecebimento.get(e.recebimento_id as string) ?? [];
      lista.push({
        id: "",
        recebimento_id: e.recebimento_id as string,
        tipo: e.tipo as "descarga" | "diaria",
        valor: Number(e.valor) || 0,
        status: "sem_data",
      });
      encargosPorRecebimento.set(e.recebimento_id as string, lista);
    }
  }

  return viagens.map((v) => {
    const freteBruto = Number(v.valor_frete) || 0;
    const rec = recebimentoPorViagem.get(v.id);
    const encargos = rec ? encargosPorRecebimento.get(rec.id) ?? [] : [];

    let descargas = somaEncargosPorTipo(encargos, "descarga");
    let diarias = somaEncargosPorTipo(encargos, "diaria");
    if (!encargos.length && rec) {
      descargas = Number(rec.valor_descargas_adicionais) || 0;
      diarias = Number(rec.valor_diarias) || 0;
    }

    const dataReceb =
      rec?.data_recebimento?.split("T")[0] ??
      dataPagamentoPorViagem.get(v.id)?.split("T")[0] ??
      null;

    const statusRaw = v.status === "DESCARREGANDO" ? "DESCARGA EM ANDAMENTO" : v.status;

    return {
      viagem_id: v.id,
      motorista_nome: v.motorista_nome,
      numero_cte: v.numero_cte ?? null,
      placas: v.placas,
      fornecedor: nomesFornecedoresViagem(v, fornecedores),
      frete_bruto: freteBruto,
      descargas,
      diarias,
      data_recebimento: dataReceb,
      status_viagem: VIAGEM_STATUS_LABEL[statusRaw] ?? statusRaw,
      saida_em: v.saida_em,
    };
  });
}

export async function buscarLinhasRelatorioTodasViagens(
  de: string,
  ate: string,
  fornecedorId?: string
): Promise<RecebimentoViagemRelatorioLinha[]> {
  const [viagens, fornecedores] = await Promise.all([
    fetchViagensAcompanhamento(),
    fetchFornecedoresAcompanhamento(),
  ]);

  const fornecedor = fornecedorId
    ? fornecedores.find((f) => f.id === fornecedorId)
    : undefined;

  const filtradas = filtrarViagensRelatorioRecebimentos(
    viagens,
    de,
    ate,
    fornecedor ?? null
  );

  return montarLinhasRelatorioTodasViagens(filtradas, fornecedores);
}
