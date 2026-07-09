import { createClient } from "@/lib/supabase/client";
import { roundKm } from "@/lib/number-format";
import { isArlaCombustivel } from "@/lib/combustivel-consumo";

export type UltimoKmVeiculo = {
  km: number;
  dataHora: string;
  origem: "frota" | "viagem";
};

export type FetchUltimoKmOpts = {
  antesDe?: string;
  excluirViagemId?: string;
};

function normalizarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

function resolverFetchUltimoKmOpts(
  opts?: string | FetchUltimoKmOpts
): FetchUltimoKmOpts {
  if (typeof opts === "string") return { antesDe: opts };
  return opts ?? {};
}

async function listarIdsVeiculosMesmaPlaca(veiculoId: string): Promise<string[]> {
  const supabase = createClient();
  const { data: veiculo } = await supabase
    .from("veiculos")
    .select("placa")
    .eq("id", veiculoId)
    .maybeSingle();

  if (!veiculo?.placa) return [veiculoId];

  const placaNorm = normalizarPlaca(veiculo.placa);
  const { data: todos } = await supabase.from("veiculos").select("id, placa");
  const ids = (todos ?? [])
    .filter((v) => normalizarPlaca(v.placa as string) === placaNorm)
    .map((v) => v.id as string);

  return ids.length ? ids : [veiculoId];
}

async function listarViagemIdsPorVeiculos(veiculoIds: string[]): Promise<string[]> {
  if (!veiculoIds.length) return [];

  const supabase = createClient();
  const ids = new Set<string>();

  const { data: vv } = await supabase
    .from("viagem_veiculos")
    .select("viagem_id")
    .in("veiculo_id", veiculoIds);
  for (const r of vv ?? []) ids.add(r.viagem_id);

  const { data: viaPrimario } = await supabase
    .from("viagens")
    .select("id")
    .in("veiculo_id", veiculoIds);
  for (const v of viaPrimario ?? []) ids.add(v.id);

  return [...ids];
}

async function listarViagemIdsPorVeiculo(veiculoId: string): Promise<string[]> {
  const veiculoIds = await listarIdsVeiculosMesmaPlaca(veiculoId);
  return listarViagemIdsPorVeiculos(veiculoIds);
}

const TIPOS_VEICULO_ODOMETRO = new Set(["cavalo", "caminhao"]);

export async function resolverVeiculoOdometroId(
  veiculoIds: string[]
): Promise<string | null> {
  if (!veiculoIds.length) return null;
  if (veiculoIds.length === 1) return veiculoIds[0];

  const supabase = createClient();
  const { data: veiculos } = await supabase
    .from("veiculos")
    .select("id, tipo")
    .in("id", veiculoIds);

  const tracao = (veiculos ?? []).find((v) =>
    TIPOS_VEICULO_ODOMETRO.has((v.tipo as string) ?? "")
  );
  return (tracao?.id as string | null) ?? veiculoIds[0];
}

export async function obterVeiculoOdometroId(viagemId: string): Promise<string | null> {
  const ids = await listarVeiculosDaViagem(viagemId);
  return resolverVeiculoOdometroId(ids);
}

/** Último abastecimento da viagem (por data, exclui Arla). */
async function fetchUltimoKmAbastecimentoPorData(
  viagemId: string
): Promise<number | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("viagem_recursos")
    .select("km_abastecimento, combustivel_tipo")
    .eq("viagem_id", viagemId)
    .eq("tipo", "abastecimento")
    .not("km_abastecimento", "is", null)
    .order("realizado_em", { ascending: false });

  for (const r of data ?? []) {
    if (isArlaCombustivel(r.combustivel_tipo)) continue;
    const km = roundKm(Number(r.km_abastecimento));
    if (km != null && km > 0) return km;
  }
  return null;
}

/**
 * KM inicial para nova viagem = último abastecimento (por data) em viagens anteriores do mesmo cavalo.
 */
export async function fetchKmInicialDeViagemAnterior(
  veiculoId: string,
  viagemAtualId?: string,
  opts?: FetchUltimoKmOpts
): Promise<number | null> {
  if (!veiculoId) return null;

  const options = opts ?? {};
  const viagemIds = await listarViagemIdsPorVeiculo(veiculoId);
  let viagensAnteriores = viagemAtualId
    ? viagemIds.filter((id) => id !== viagemAtualId)
    : [...viagemIds];

  if (!viagensAnteriores.length) return null;

  const supabase = createClient();

  if (viagemAtualId) {
    const { data: atual } = await supabase
      .from("viagens")
      .select("saida_em")
      .eq("id", viagemAtualId)
      .maybeSingle();

    const saidaAtual = (atual?.saida_em as string | null) ?? null;
    if (saidaAtual) {
      const { data: antes } = await supabase
        .from("viagens")
        .select("id")
        .in("id", viagensAnteriores)
        .not("saida_em", "is", null)
        .lt("saida_em", saidaAtual);
      if (!antes?.length) return null;
      viagensAnteriores = antes.map((v) => v.id as string);
    }
  }

  if (options.antesDe) {
    const { data: antesDe } = await supabase
      .from("viagens")
      .select("id")
      .in("id", viagensAnteriores)
      .not("saida_em", "is", null)
      .lte("saida_em", options.antesDe);
    if (antesDe?.length) {
      viagensAnteriores = antesDe.map((v) => v.id as string);
    }
  }

  if (!viagensAnteriores.length) return null;

  let abastQuery = supabase
    .from("viagem_recursos")
    .select("km_abastecimento, realizado_em, combustivel_tipo")
    .eq("tipo", "abastecimento")
    .in("viagem_id", viagensAnteriores)
    .not("km_abastecimento", "is", null)
    .order("realizado_em", { ascending: false });

  if (options.antesDe) {
    abastQuery = abastQuery.lte("realizado_em", options.antesDe);
  }

  const { data: abastecimentos } = await abastQuery;

  for (const r of abastecimentos ?? []) {
    if (isArlaCombustivel(r.combustivel_tipo)) continue;
    const km = roundKm(Number(r.km_abastecimento));
    if (km != null && km > 0) return km;
  }

  return null;
}

/** KM inicial esperado para uma viagem já cadastrada. */
export async function fetchKmInicialParaViagem(viagemId: string): Promise<number | null> {
  const veiculoId = await obterVeiculoOdometroId(viagemId);
  if (!veiculoId) return null;
  return fetchKmInicialDeViagemAnterior(veiculoId, viagemId);
}

/**
 * Último odômetro do cavalo para cadastrar nova viagem.
 * Regra: último abastecimento da viagem anterior do mesmo cavalo.
 */
export async function fetchUltimoKmVeiculo(
  veiculoId: string,
  opts?: string | FetchUltimoKmOpts
): Promise<UltimoKmVeiculo | null> {
  const options = resolverFetchUltimoKmOpts(opts);
  const km = await fetchKmInicialDeViagemAnterior(
    veiculoId,
    options.excluirViagemId,
    options
  );
  if (km == null) return null;
  return { km, dataHora: new Date().toISOString(), origem: "viagem" };
}

/** KM final da viagem = último abastecimento lançado nela (por data). */
export async function fetchUltimoKmAbastecimentoViagem(
  viagemId: string
): Promise<number | null> {
  return fetchUltimoKmAbastecimentoPorData(viagemId);
}

export function calcularKmRodado(
  kmInicial: number | null | undefined,
  kmFinal: number | null | undefined
): number | null {
  const ini = Number(kmInicial);
  const fin = Number(kmFinal);
  if (!Number.isFinite(ini) || !Number.isFinite(fin) || fin < ini) return null;
  return Math.round((fin - ini) * 10) / 10;
}

export async function listarVeiculosDaViagem(viagemId: string): Promise<string[]> {
  const supabase = createClient();
  const { data: viagem } = await supabase
    .from("viagens")
    .select("veiculo_id, viagem_veiculos(veiculo_id)")
    .eq("id", viagemId)
    .single();

  if (!viagem) return [];

  const ids = new Set<string>();
  if (viagem.veiculo_id) ids.add(viagem.veiculo_id as string);
  const vv = viagem.viagem_veiculos as { veiculo_id: string }[] | null;
  for (const row of vv ?? []) ids.add(row.veiculo_id);
  return [...ids];
}

async function viagemTemAbastecimentoComKm(viagemId: string): Promise<boolean> {
  const km = await fetchUltimoKmAbastecimentoPorData(viagemId);
  return km != null && km > 0;
}

const STATUS_SEM_ATUALIZAR_KM_INICIAL = new Set([
  "FINALIZADO",
  "PAGAMENTO PENDENTE",
  "ARQUIVADO",
]);

async function gravarKmInicialViagem(
  viagemId: string,
  kmNovo: number
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("viagens")
    .update({ km_odometro_inicial: kmNovo })
    .eq("id", viagemId);
  return error?.message ?? null;
}

async function atualizarKmInicialViagem(viagemId: string): Promise<string | null> {
  const kmNovo = await fetchKmInicialParaViagem(viagemId);
  if (kmNovo == null) return null;

  const supabase = createClient();
  const { data: viagem } = await supabase
    .from("viagens")
    .select("km_odometro_inicial")
    .eq("id", viagemId)
    .maybeSingle();

  const kmAtual = roundKm(
    viagem?.km_odometro_inicial != null ? Number(viagem.km_odometro_inicial) : null
  );
  if (kmAtual === kmNovo) return null;

  return gravarKmInicialViagem(viagemId, kmNovo);
}

export async function syncKmInicialViagensAgendadas(
  veiculoId: string
): Promise<string | null> {
  const viagemIds = await listarViagemIdsPorVeiculo(veiculoId);
  if (!viagemIds.length) return null;

  const supabase = createClient();
  const { data: agendadas, error } = await supabase
    .from("viagens")
    .select("id")
    .in("id", viagemIds)
    .eq("status", "AGENDADA");

  if (error) return error.message;

  for (const v of agendadas ?? []) {
    const err = await atualizarKmInicialViagem(v.id);
    if (err) return err;
  }

  return null;
}

export async function syncKmInicialAoAbrirViagem(
  viagemId: string
): Promise<string | null> {
  if (!viagemId) return null;

  const supabase = createClient();
  const { data: viagem, error } = await supabase
    .from("viagens")
    .select("status")
    .eq("id", viagemId)
    .maybeSingle();

  if (error) return error.message;
  if (!viagem || STATUS_SEM_ATUALIZAR_KM_INICIAL.has(viagem.status)) return null;

  if (
    viagem.status !== "AGENDADA" &&
    (await viagemTemAbastecimentoComKm(viagemId))
  ) {
    return null;
  }

  return atualizarKmInicialViagem(viagemId);
}

export async function syncQuilometragemViagem(viagemId: string): Promise<string | null> {
  const supabase = createClient();
  const ultimoKmViagem = roundKm(await fetchUltimoKmAbastecimentoViagem(viagemId));

  const { data: atual, error: errAtual } = await supabase
    .from("viagens")
    .select("km_odometro_final")
    .eq("id", viagemId)
    .single();

  if (errAtual) return errAtual.message;

  const kmFinalGravado =
    atual?.km_odometro_final != null ? Number(atual.km_odometro_final) : null;

  if (ultimoKmViagem !== kmFinalGravado) {
    const { error: upErr } = await supabase
      .from("viagens")
      .update({ km_odometro_final: ultimoKmViagem })
      .eq("id", viagemId);
    if (upErr) return upErr.message;
  }

  const veiculoId = await obterVeiculoOdometroId(viagemId);
  if (!veiculoId) return null;

  const viagemIds = await listarViagemIdsPorVeiculo(veiculoId);
  const { data: outras } = await supabase
    .from("viagens")
    .select("id, status")
    .in("id", viagemIds)
    .neq("id", viagemId);

  for (const v of outras ?? []) {
    if (STATUS_SEM_ATUALIZAR_KM_INICIAL.has(v.status)) continue;
    if (v.status !== "AGENDADA" && (await viagemTemAbastecimentoComKm(v.id))) {
      continue;
    }
    const err = await atualizarKmInicialViagem(v.id);
    if (err) return err;
  }

  return null;
}
