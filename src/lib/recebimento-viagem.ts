import { createClient } from "@/lib/supabase/client";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { calcularFreteLiquido, ICMS_FRETE_PERCENT } from "@/types/fechamento";
import type { RecebimentoStatus, ViagemRecebimento } from "@/types/recebimento";

type VeiculoRef = { nome: string; placa: string };

function extrairVeiculos(
  viagem: {
    veiculos: VeiculoRef | VeiculoRef[] | null;
    viagem_veiculos?: { ordem: number; veiculos: VeiculoRef | VeiculoRef[] }[] | null;
  }
): VeiculoRef[] {
  const vv = viagem.viagem_veiculos ?? [];
  const lista = vv
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => {
      const v = item.veiculos;
      return Array.isArray(v) ? v[0] : v;
    })
    .filter((v): v is VeiculoRef => !!v);

  if (lista.length > 0) return lista;

  const fallback = viagem.veiculos;
  const unico = Array.isArray(fallback) ? fallback[0] : fallback;
  return unico ? [unico] : [];
}

function placasLabel(veiculos: VeiculoRef[]) {
  return veiculos.map((v) => v.placa).join(", ") || "—";
}

/** Cria ou atualiza registro de recebimento quando a viagem é arquivada. */
export async function syncRecebimentoViagem(viagemId: string): Promise<string | null> {
  const supabase = createClient();

  const { data: viagem, error: errV } = await supabase
    .from("viagens")
    .select(
      `
      id, status, local_saida, valor_frete,
      motoristas ( nome_completo ),
      veiculos ( nome, placa ),
      viagem_veiculos ( ordem, veiculos ( nome, placa ) )
    `
    )
    .eq("id", viagemId)
    .single();

  if (errV || !viagem) return errV?.message ?? "Viagem não encontrada";
  if (viagem.status !== "ARQUIVADO") return null;

  const motorista = viagem.motoristas as { nome_completo: string } | { nome_completo: string }[] | null;
  const motoristaNome = Array.isArray(motorista)
    ? motorista[0]?.nome_completo
    : motorista?.nome_completo;

  const veiculos = extrairVeiculos(viagem as Parameters<typeof extrairVeiculos>[0]);
  const valorFrete = Number(viagem.valor_frete) || 0;
  const freteLiquido = calcularFreteLiquido(valorFrete, ICMS_FRETE_PERCENT);

  const payload = {
    viagem_id: viagemId,
    motorista_nome: motoristaNome ?? "—",
    veiculos_placas: placasLabel(veiculos),
    empresa: viagem.local_saida ?? "—",
    valor_frete_total: valorFrete,
    valor_frete_liquido: Math.round(freteLiquido * 100) / 100,
  };

  const { data: existente } = await supabase
    .from("viagem_recebimentos")
    .select("id, valor_descargas_adicionais, data_recebimento, status, observacao")
    .eq("viagem_id", viagemId)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("viagem_recebimentos")
      .update(payload)
      .eq("id", existente.id);
    return error?.message ?? null;
  }

  const { error } = await supabase.from("viagem_recebimentos").insert(payload);
  return error?.message ?? null;
}

/** Garante recebimento para todas as viagens arquivadas sem registro. */
export async function syncRecebimentosArquivados(): Promise<void> {
  const supabase = createClient();
  const { data: viagens } = await supabase
    .from("viagens")
    .select("id")
    .eq("status", "ARQUIVADO");

  for (const v of viagens ?? []) {
    await syncRecebimentoViagem(v.id);
  }
}

export async function atualizarRecebimento(
  id: string,
  patch: Partial<{
    valor_descargas_adicionais: number;
    data_recebimento: string | null;
    status: RecebimentoStatus;
    observacao: string | null;
  }>
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.from("viagem_recebimentos").update(patch).eq("id", id);
  return error?.message ?? null;
}

export type RecebimentoComCanhotos = ViagemRecebimento & {
  canhotos: { id: string; file_name: string; storage_path: string }[];
};

export async function fetchRecebimentos(): Promise<RecebimentoComCanhotos[]> {
  const supabase = createClient();
  await syncRecebimentosArquivados();

  const { data: viagensArquivadas } = await supabase
    .from("viagens")
    .select("id")
    .eq("status", "ARQUIVADO");

  const ids = (viagensArquivadas ?? []).map((v) => v.id);
  if (!ids.length) return [];

  const { data: recebimentos, error } = await supabase
    .from("viagem_recebimentos")
    .select("*")
    .in("viagem_id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  const { data: canhotos } = await supabase
    .from("viagem_canhotos")
    .select("id, viagem_id, file_name, storage_path")
    .in("viagem_id", ids);

  const canhotosPorViagem = new Map<string, { id: string; file_name: string; storage_path: string }[]>();
  for (const c of canhotos ?? []) {
    const lista = canhotosPorViagem.get(c.viagem_id) ?? [];
    lista.push({ id: c.id, file_name: c.file_name, storage_path: c.storage_path });
    canhotosPorViagem.set(c.viagem_id, lista);
  }

  return (recebimentos ?? []).map((r) => ({
    ...(r as ViagemRecebimento),
    canhotos: canhotosPorViagem.get(r.viagem_id) ?? [],
  }));
}
