import { createClient } from "@/lib/supabase/client";
import { isFrota } from "@/lib/viagem-validation";
import { calcularFreteLiquido, ICMS_FRETE_PERCENT } from "@/types/fechamento";
import type {
  RecebimentoStatus,
  RecebimentoEncargoTipo,
  RecebimentoEncargoStatus,
  ViagemRecebimento,
  ViagemRecebimentoEncargo,
} from "@/types/recebimento";
import type { RecursoVinculo } from "@/types";

type VeiculoRef = { vinculo?: RecursoVinculo | null; nome?: string; placa?: string };

type ViagemVeiculosRef = {
  veiculos: VeiculoRef | VeiculoRef[] | null;
  viagem_veiculos?: { ordem: number; veiculos: VeiculoRef | VeiculoRef[] }[] | null;
};

function extrairVeiculos(viagem: ViagemVeiculosRef): VeiculoRef[] {
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
  return veiculos.map((v) => v.placa ?? "—").join(", ") || "—";
}

/** Viagem da frota própria: todos os veículos vinculados têm vínculo frota. */
export function viagemEhFrota(viagem: ViagemVeiculosRef): boolean {
  const veiculos = extrairVeiculos(viagem);
  if (veiculos.length === 0) return true;
  return veiculos.every((v) => isFrota(v.vinculo));
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
    .select("id, valor_descargas_adicionais, valor_diarias, data_recebimento, status, observacao")
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

async function sincronizarTotaisEncargos(recebimentoId: string): Promise<string | null> {
  const supabase = createClient();
  const { data: encargos, error: errList } = await supabase
    .from("viagem_recebimento_encargos")
    .select("tipo, valor")
    .eq("recebimento_id", recebimentoId);

  if (errList) return errList.message;

  let descargas = 0;
  let diarias = 0;
  for (const e of encargos ?? []) {
    const v = Number(e.valor) || 0;
    if (e.tipo === "descarga") descargas += v;
    else diarias += v;
  }

  const { error } = await supabase
    .from("viagem_recebimentos")
    .update({
      valor_descargas_adicionais: Math.round(descargas * 100) / 100,
      valor_diarias: Math.round(diarias * 100) / 100,
    })
    .eq("id", recebimentoId);

  return error?.message ?? null;
}

export async function adicionarEncargoRecebimento(
  id: string,
  opts: {
    tipo: RecebimentoEncargoTipo;
    valor: number;
    numero_cte?: string | null;
    data_recebimento?: string | null;
    status?: RecebimentoEncargoStatus;
  }
): Promise<string | null> {
  const valor = opts.valor;
  if (!Number.isFinite(valor) || valor <= 0) {
    return "Informe um valor maior que zero.";
  }

  const supabase = createClient();
  const { data: atual, error: errGet } = await supabase
    .from("viagem_recebimentos")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (errGet) return errGet.message;
  if (!atual) return "Recebimento não encontrado.";

  const dataReceb = opts.data_recebimento?.trim() || null;
  const status: RecebimentoEncargoStatus =
    opts.status ?? (dataReceb ? "pendente" : "sem_data");

  const { error: errInsert } = await supabase.from("viagem_recebimento_encargos").insert({
    recebimento_id: id,
    tipo: opts.tipo,
    valor: Math.round(valor * 100) / 100,
    numero_cte: opts.numero_cte?.trim() || null,
    data_recebimento: dataReceb,
    status,
  });

  if (errInsert) return errInsert.message;
  return sincronizarTotaisEncargos(id);
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
  encargos: ViagemRecebimentoEncargo[];
  eh_frota: boolean;
};

export async function fetchRecebimentos(): Promise<RecebimentoComCanhotos[]> {
  const supabase = createClient();
  await syncRecebimentosArquivados();

  const { data: viagensArquivadas } = await supabase
    .from("viagens")
    .select(
      `
      id, numero_cte,
      veiculos ( vinculo ),
      viagem_veiculos ( ordem, veiculos ( vinculo ) )
    `
    )
    .eq("status", "ARQUIVADO");

  const frotaPorViagem = new Map(
    (viagensArquivadas ?? []).map((v) => [
      v.id,
      viagemEhFrota(v as ViagemVeiculosRef),
    ])
  );

  const ids = [...frotaPorViagem.keys()];
  if (!ids.length) return [];

  const ctePorViagem = new Map(
    (viagensArquivadas ?? []).map((v) => [v.id, v.numero_cte as string | null])
  );

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

  const recebimentoIds = (recebimentos ?? []).map((r) => r.id);
  const encargosPorRecebimento = new Map<string, ViagemRecebimentoEncargo[]>();

  if (recebimentoIds.length) {
    const { data: encargosRows, error: errEnc } = await supabase
      .from("viagem_recebimento_encargos")
      .select("*")
      .in("recebimento_id", recebimentoIds)
      .order("created_at", { ascending: true });

    if (errEnc) {
      console.error("viagem_recebimento_encargos:", errEnc);
    } else {
      for (const e of encargosRows ?? []) {
        const row = e as ViagemRecebimentoEncargo;
        const lista = encargosPorRecebimento.get(row.recebimento_id) ?? [];
        lista.push({ ...row, valor: Number(row.valor) || 0 });
        encargosPorRecebimento.set(row.recebimento_id, lista);
      }
    }
  }

  const canhotosPorViagem = new Map<string, { id: string; file_name: string; storage_path: string }[]>();
  for (const c of canhotos ?? []) {
    const lista = canhotosPorViagem.get(c.viagem_id) ?? [];
    lista.push({ id: c.id, file_name: c.file_name, storage_path: c.storage_path });
    canhotosPorViagem.set(c.viagem_id, lista);
  }

  return (recebimentos ?? []).map((r) => {
    const row = r as ViagemRecebimento;
    return {
      ...row,
      valor_diarias: Number(row.valor_diarias) || 0,
      numero_cte: ctePorViagem.get(r.viagem_id) ?? null,
      eh_frota: frotaPorViagem.get(r.viagem_id) ?? true,
      canhotos: canhotosPorViagem.get(r.viagem_id) ?? [],
      encargos: encargosPorRecebimento.get(r.id) ?? [],
    };
  });
}
