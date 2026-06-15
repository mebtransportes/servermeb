import { createClient } from "@/lib/supabase/client";
import type { Viagem } from "@/types";

export type ViagemCteDuplicada = {
  id: string;
  saida_em: string;
  motorista_nome: string;
};

/** Verifica se o CT-e já está em outra viagem (comparação sem diferenciar maiúsculas). */
export async function buscarViagemComMesmoCte(
  numeroCte: string,
  excludeViagemId?: string
): Promise<ViagemCteDuplicada | null> {
  const cte = numeroCte.trim();
  if (!cte) return null;

  const supabase = createClient();
  let query = supabase
    .from("viagens")
    .select("id, saida_em, motoristas ( nome_completo )")
    .ilike("numero_cte", cte);

  if (excludeViagemId) {
    query = query.neq("id", excludeViagemId);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) return null;

  const m = data.motoristas as
    | { nome_completo: string }
    | { nome_completo: string }[]
    | null;
  const motorista = Array.isArray(m) ? m[0] : m;

  return {
    id: data.id,
    saida_em: data.saida_em,
    motorista_nome: motorista?.nome_completo ?? "—",
  };
}

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
  fornecedores: { local_fornecedor: string; ordem: number }[];
  veiculo_ids: string[];
};

export function formatarVeiculosLabel(
  veiculos: { nome: string; placa: string }[]
): string {
  if (!veiculos.length) return "—";
  return veiculos.map((v) => `${v.nome} — ${v.placa}`).join(" · ");
}

export async function fetchViagensLista(): Promise<ViagemListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagens")
    .select(
      `
      id, status, saida_em, local_saida, numero_cte, valor_frete,
      motoristas ( nome_completo ),
      veiculos ( nome, placa ),
      viagem_veiculos ( ordem, veiculos ( nome, placa ) )
    `
    )
    .order("saida_em", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const m = row.motoristas as { nome_completo: string } | { nome_completo: string }[] | null;
    const motorista = Array.isArray(m) ? m[0] : m;
    const vv = row.viagem_veiculos as
      | { ordem: number; veiculos: { nome: string; placa: string } | { nome: string; placa: string }[] }[]
      | null;
    const veiculosViagem = (vv ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => {
        const v = item.veiculos;
        return Array.isArray(v) ? v[0] : v;
      })
      .filter((v): v is { nome: string; placa: string } => !!v);
    const fallback = row.veiculos as
      | { nome: string; placa: string }
      | { nome: string; placa: string }[]
      | null;
    const veiculoFallback = Array.isArray(fallback) ? fallback[0] : fallback;
    const listaVeiculos =
      veiculosViagem.length > 0
        ? veiculosViagem
        : veiculoFallback
          ? [veiculoFallback]
          : [];
    return {
      id: row.id,
      status: row.status,
      saida_em: row.saida_em,
      local_saida: row.local_saida,
      numero_cte: row.numero_cte,
      valor_frete: row.valor_frete,
      motorista_nome: motorista?.nome_completo ?? "—",
      veiculo_label: formatarVeiculosLabel(listaVeiculos),
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

  const { data: fornecedores } = await supabase
    .from("viagem_fornecedores")
    .select("local_fornecedor, ordem")
    .eq("viagem_id", id)
    .order("ordem");

  const { data: vv } = await supabase
    .from("viagem_veiculos")
    .select("veiculo_id, ordem")
    .eq("viagem_id", id)
    .order("ordem");

  const veiculo_ids = (vv ?? []).map((r) => r.veiculo_id);
  const ids =
    veiculo_ids.length > 0
      ? veiculo_ids
      : viagem.veiculo_id
        ? [viagem.veiculo_id as string]
        : [];

  const fornecedoresLista = fornecedores ?? [];
  return {
    ...(viagem as Viagem),
    entregas: entregas ?? [],
    fornecedores:
      fornecedoresLista.length > 0
        ? fornecedoresLista
        : viagem.local_saida
          ? [{ ordem: 1, local_fornecedor: viagem.local_saida as string }]
          : [],
    veiculo_ids: ids,
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
