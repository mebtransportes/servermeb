import { createClient } from "@/lib/supabase/client";
import type { ViagemFechamento } from "@/types/fechamento";
import { calcularComissionamento } from "@/types/fechamento";
import { VIAGEM_STATUS_FECHAMENTO } from "@/lib/viagem-status";

export async function fetchViagemFechamentos(): Promise<ViagemFechamento[]> {
  const supabase = createClient();

  const { data: viagens, error: errV } = await supabase
    .from("viagens")
    .select("id, status")
    .in("status", [...VIAGEM_STATUS_FECHAMENTO]);

  if (errV) {
    console.warn(errV.message);
    return [];
  }

  const viagemIds = (viagens ?? []).map((v) => v.id);
  if (!viagemIds.length) return [];

  const statusPorViagem = new Map(
    (viagens ?? []).map((v) => [v.id, v.status as string])
  );

  const { data, error } = await supabase
    .from("viagem_fechamentos")
    .select("*")
    .in("viagem_id", viagemIds)
    .order("data_embarque", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...(row as ViagemFechamento),
    viagem_status: statusPorViagem.get(row.viagem_id) ?? null,
  }));
}

export async function fetchFechamentoPorId(id: string): Promise<ViagemFechamento | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagem_fechamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ViagemFechamento;
}

export async function fetchMotoristasOptions() {
  const supabase = createClient();
  const { data } = await supabase
    .from("motoristas")
    .select("id, nome_completo, cpf")
    .order("nome_completo");
  return (data ?? []) as { id: string; nome_completo: string; cpf?: string }[];
}

export async function atualizarFechamentoConfig(opts: {
  id: string;
  valorFrete: number;
  reembolso: number;
  icmsPercent: number;
  comissaoTipo: "PERCENTUAL" | "LIQUIDO_TOTAL";
  comissaoPercent: number;
  motoristaTerceiro?: boolean;
  adiantamentoValor?: number;
  totalDespesas?: number;
  totalDespesasMotorista?: number;
}) {
  const supabase = createClient();
  const { frete_liquido, comissao_final, valor_icms } = calcularComissionamento({
    valorFrete: opts.valorFrete,
    icmsPercent: opts.icmsPercent,
    comissaoPercent: opts.comissaoPercent,
    comissaoTipo: opts.comissaoTipo,
    reembolso: opts.reembolso,
    adiantamento: opts.adiantamentoValor,
    motoristaTerceiro: opts.motoristaTerceiro,
    totalDespesas: opts.totalDespesas,
    totalDespesasMotorista: opts.totalDespesasMotorista,
  });

  const { data, error } = await supabase
    .from("viagem_fechamentos")
    .update({
      icms_percent: opts.icmsPercent,
      comissao_tipo: opts.comissaoTipo,
      comissao_percent: opts.comissaoPercent,
      frete_liquido,
      valor_icms,
      comissao_final,
    })
    .eq("id", opts.id)
    .select("*")
    .single();

  if (error) return { error: error.message, data: null };
  return { error: null, data: data as ViagemFechamento };
}

export async function atualizarDataPagamentoTerceiro(opts: {
  fechamentoId: string;
  viagemId: string;
  dataPagamento: string | null;
}) {
  const supabase = createClient();
  const dataVal = opts.dataPagamento?.trim() || null;

  const { error: errViagem } = await supabase
    .from("viagens")
    .update({ data_pagamento_terceiro: dataVal })
    .eq("id", opts.viagemId);

  if (errViagem) return { error: errViagem.message, data: null };

  const { data, error } = await supabase
    .from("viagem_fechamentos")
    .update({ data_pagamento: dataVal })
    .eq("id", opts.fechamentoId)
    .select("*")
    .single();

  if (error) return { error: error.message, data: null };
  return { error: null, data: data as ViagemFechamento };
}
