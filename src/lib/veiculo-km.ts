import { createClient } from "@/lib/supabase/client";
import { roundKm } from "@/lib/number-format";
import { isArlaCombustivel } from "@/lib/combustivel-consumo";

export type UltimoKmVeiculo = {
  km: number;
  dataHora: string;
  origem: "frota" | "viagem";
};

function candidatoKm(
  kmRaw: unknown,
  dataHora: string,
  origem: UltimoKmVeiculo["origem"]
): UltimoKmVeiculo | null {
  const km = Number(kmRaw);
  if (!Number.isFinite(km) || km <= 0) return null;
  const kmRounded = roundKm(km);
  if (kmRounded == null || kmRounded <= 0) return null;
  return { km: kmRounded, dataHora, origem };
}

/** Último odômetro registrado em abastecimento (frota ou viagem), pelo registro mais recente. */
export async function fetchUltimoKmVeiculo(
  veiculoId: string,
  antesDe?: string
): Promise<UltimoKmVeiculo | null> {
  if (!veiculoId) return null;

  const supabase = createClient();
  const candidatos: UltimoKmVeiculo[] = [];

  let frotaQuery = supabase
    .from("frota_abastecimentos")
    .select("km_abastecimento, data_hora")
    .eq("veiculo_id", veiculoId)
    .not("km_abastecimento", "is", null)
    .order("data_hora", { ascending: false })
    .limit(1);

  if (antesDe) {
    frotaQuery = frotaQuery.lte("data_hora", antesDe);
  }

  const { data: frota } = await frotaQuery.maybeSingle();
  const frotaCand = frota
    ? candidatoKm(frota.km_abastecimento, frota.data_hora, "frota")
    : null;
  if (frotaCand) candidatos.push(frotaCand);

  const viagemIds = await listarViagemIdsPorVeiculo(veiculoId);

  if (viagemIds.length > 0) {
    let viagemQuery = supabase
      .from("viagem_recursos")
      .select("km_abastecimento, realizado_em, combustivel_tipo")
      .eq("tipo", "abastecimento")
      .in("viagem_id", viagemIds)
      .not("km_abastecimento", "is", null)
      .order("realizado_em", { ascending: false })
      .limit(30);

    if (antesDe) {
      viagemQuery = viagemQuery.lte("realizado_em", antesDe);
    }

    const { data: viagemRecs } = await viagemQuery;
    for (const viagemRec of viagemRecs ?? []) {
      if (isArlaCombustivel(viagemRec.combustivel_tipo)) continue;
      const viagemCand = candidatoKm(
        viagemRec.km_abastecimento,
        viagemRec.realizado_em,
        "viagem"
      );
      if (viagemCand) {
        candidatos.push(viagemCand);
        break;
      }
    }
  }

  if (!candidatos.length) return null;

  candidatos.sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );
  return candidatos[0];
}

/** KM do odômetro no último abastecimento da viagem (exclui Arla), pelo registro mais recente. */
export async function fetchUltimoKmAbastecimentoViagem(
  viagemId: string
): Promise<number | null> {
  if (!viagemId) return null;

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
    const km = Number(r.km_abastecimento);
    if (Number.isFinite(km) && km > 0) return roundKm(km);
  }
  return null;
}

/** KM rodado = odômetro final − odômetro inicial. */
export function calcularKmRodado(
  kmInicial: number | null | undefined,
  kmFinal: number | null | undefined
): number | null {
  const ini = Number(kmInicial);
  const fin = Number(kmFinal);
  if (!Number.isFinite(ini) || !Number.isFinite(fin) || fin < ini) return null;
  return Math.round((fin - ini) * 10) / 10;
}

async function listarViagemIdsPorVeiculo(veiculoId: string): Promise<string[]> {
  const supabase = createClient();
  const { data: vv } = await supabase
    .from("viagem_veiculos")
    .select("viagem_id")
    .eq("veiculo_id", veiculoId);

  const ids = new Set((vv ?? []).map((r) => r.viagem_id));

  const { data: viaPrimario } = await supabase
    .from("viagens")
    .select("id")
    .eq("veiculo_id", veiculoId);

  for (const v of viaPrimario ?? []) ids.add(v.id);
  return [...ids];
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

/** Atualiza km_odometro_inicial das viagens AGENDADAS do veículo com o último KM de abastecimento. */
export async function syncKmInicialViagensAgendadas(
  veiculoId: string
): Promise<string | null> {
  if (!veiculoId) return null;

  const ultimo = await fetchUltimoKmVeiculo(veiculoId);
  if (!ultimo) return null;

  const viagemIds = await listarViagemIdsPorVeiculo(veiculoId);
  if (!viagemIds.length) return null;

  const supabase = createClient();
  const { data: agendadas, error } = await supabase
    .from("viagens")
    .select("id, km_odometro_inicial")
    .in("id", viagemIds)
    .eq("status", "AGENDADA");

  if (error) return error.message;

  for (const v of agendadas ?? []) {
    const kmAtual = roundKm(
      v.km_odometro_inicial != null ? Number(v.km_odometro_inicial) : null
    );
    if (kmAtual === ultimo.km) continue;

    const { error: upErr } = await supabase
      .from("viagens")
      .update({ km_odometro_inicial: ultimo.km })
      .eq("id", v.id);

    if (upErr) return upErr.message;
  }

  return null;
}

/** Ao abrir uma viagem AGENDADA, atualiza o KM inicial com o último abastecimento do veículo. */
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
  if (!viagem || viagem.status !== "AGENDADA") return null;

  const veiculoIds = await listarVeiculosDaViagem(viagemId);
  for (const veiculoId of veiculoIds) {
    const err = await syncKmInicialViagensAgendadas(veiculoId);
    if (err) return err;
  }

  return null;
}

/**
 * Atualiza KM final da viagem (último abastecimento lançado nela) e propaga o KM inicial
 * para viagens AGENDADAS dos mesmos veículos.
 */
export async function syncQuilometragemViagem(viagemId: string): Promise<string | null> {
  if (!viagemId) return null;

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

  const veiculoIds = await listarVeiculosDaViagem(viagemId);
  for (const veiculoId of veiculoIds) {
    const err = await syncKmInicialViagensAgendadas(veiculoId);
    if (err) return err;
  }

  return null;
}
