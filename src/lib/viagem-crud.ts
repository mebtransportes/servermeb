import { createClient } from "@/lib/supabase/client";
import type { Viagem } from "@/types";

export type ViagemListItem = {
  id: string;
  status: string;
  saida_em: string;
  local_saida: string;
  numero_cte?: string | null;
  valor_frete?: number | null;
  motorista_nome: string;
  veiculo_label: string;
};

export type ViagemParaEdicao = Viagem & {
  entregas: { local_entrega: string; ordem: number }[];
};

export async function fetchViagensLista(): Promise<ViagemListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagens")
    .select(
      `
      id, status, saida_em, local_saida, numero_cte, valor_frete,
      motoristas ( nome_completo ),
      veiculos ( nome, placa )
    `
    )
    .order("saida_em", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const m = row.motoristas as { nome_completo: string } | { nome_completo: string }[] | null;
    const v = row.veiculos as { nome: string; placa: string } | { nome: string; placa: string }[] | null;
    const motorista = Array.isArray(m) ? m[0] : m;
    const veiculo = Array.isArray(v) ? v[0] : v;
    return {
      id: row.id,
      status: row.status,
      saida_em: row.saida_em,
      local_saida: row.local_saida,
      numero_cte: row.numero_cte,
      valor_frete: row.valor_frete,
      motorista_nome: motorista?.nome_completo ?? "—",
      veiculo_label: veiculo ? `${veiculo.nome} — ${veiculo.placa}` : "—",
    };
  });
}

export async function fetchViagemParaEdicao(id: string): Promise<ViagemParaEdicao | null> {
  const supabase = createClient();
  const { data: viagem, error } = await supabase.from("viagens").select("*").eq("id", id).single();
  if (error || !viagem) return null;

  const { data: entregas } = await supabase
    .from("viagem_entregas")
    .select("local_entrega, ordem")
    .eq("viagem_id", id)
    .order("ordem");

  return {
    ...(viagem as Viagem),
    entregas: entregas ?? [],
  };
}

export async function excluirViagem(id: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.from("viagens").delete().eq("id", id);
  return error?.message ?? null;
}

export function isoParaDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
