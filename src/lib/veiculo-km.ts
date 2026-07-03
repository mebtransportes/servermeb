import { createClient } from "@/lib/supabase/client";

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
  return { km, dataHora, origem };
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

  const { data: viagensDoVeiculo } = await supabase
    .from("viagem_veiculos")
    .select("viagem_id")
    .eq("veiculo_id", veiculoId);

  let viagemIds = [...new Set((viagensDoVeiculo ?? []).map((r) => r.viagem_id))];

  if (viagemIds.length === 0) {
    const { data: viaPrimario } = await supabase
      .from("viagens")
      .select("id")
      .eq("veiculo_id", veiculoId);
    viagemIds = (viaPrimario ?? []).map((v) => v.id);
  }

  if (viagemIds.length > 0) {
    let viagemQuery = supabase
      .from("viagem_recursos")
      .select("km_abastecimento, realizado_em")
      .eq("tipo", "abastecimento")
      .in("viagem_id", viagemIds)
      .not("km_abastecimento", "is", null)
      .order("realizado_em", { ascending: false })
      .limit(1);

    if (antesDe) {
      viagemQuery = viagemQuery.lte("realizado_em", antesDe);
    }

    const { data: viagemRec } = await viagemQuery.maybeSingle();
    const viagemCand = viagemRec
      ? candidatoKm(viagemRec.km_abastecimento, viagemRec.realizado_em, "viagem")
      : null;
    if (viagemCand) candidatos.push(viagemCand);
  }

  if (!candidatos.length) return null;

  candidatos.sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );
  return candidatos[0];
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
