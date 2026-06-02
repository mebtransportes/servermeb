import { createClient } from "@/lib/supabase/client";
import type { ViagemFechamento } from "@/types/fechamento";
import { calcularComissionamento } from "@/types/fechamento";

export async function fetchViagemFechamentos(): Promise<ViagemFechamento[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagem_fechamentos")
    .select("*")
    .order("data_embarque", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }
  return (data ?? []) as ViagemFechamento[];
}

export async function fetchMotoristasOptions() {
  const supabase = createClient();
  const { data } = await supabase
    .from("motoristas")
    .select("id, nome_completo")
    .order("nome_completo");
  return (data ?? []) as { id: string; nome_completo: string }[];
}

export async function atualizarFechamentoConfig(opts: {
  id: string;
  valorFrete: number;
  reembolso: number;
  icmsPercent: number;
  comissaoTipo: "PERCENTUAL" | "LIQUIDO_TOTAL";
  comissaoPercent: number;
}) {
  const supabase = createClient();
  const { frete_liquido, comissao_final } = calcularComissionamento({
    valorFrete: opts.valorFrete,
    icmsPercent: opts.icmsPercent,
    comissaoPercent: opts.comissaoPercent,
    comissaoTipo: opts.comissaoTipo,
    reembolso: opts.reembolso,
  });

  const { data, error } = await supabase
    .from("viagem_fechamentos")
    .update({
      icms_percent: opts.icmsPercent,
      comissao_tipo: opts.comissaoTipo,
      comissao_percent: opts.comissaoPercent,
      frete_liquido,
      comissao_final,
    })
    .eq("id", opts.id)
    .select("*")
    .single();

  if (error) return { error: error.message, data: null };
  return { error: null, data: data as ViagemFechamento };
}
