import { createClient } from "@/lib/supabase/client";

export type UltimoKmVeiculo = {
  km: number;
  dataHora: string;
  origem: "frota" | "viagem";
};

/** Último odômetro registrado em abastecimento (frota manual ou gasto de viagem). */
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
  if (frota?.km_abastecimento != null) {
    const km = Number(frota.km_abastecimento);
    if (Number.isFinite(km) && km > 0) {
      candidatos.push({
        km,
        dataHora: frota.data_hora,
        origem: "frota",
      });
    }
  }

  let viagemQuery = supabase
    .from("viagem_recursos")
    .select("km_abastecimento, realizado_em, viagens!inner(veiculo_id)")
    .eq("tipo", "abastecimento")
    .eq("viagens.veiculo_id", veiculoId)
    .not("km_abastecimento", "is", null)
    .order("realizado_em", { ascending: false })
    .limit(1);

  if (antesDe) {
    viagemQuery = viagemQuery.lte("realizado_em", antesDe);
  }

  const { data: viagemRec } = await viagemQuery.maybeSingle();
  if (viagemRec?.km_abastecimento != null) {
    const km = Number(viagemRec.km_abastecimento);
    if (Number.isFinite(km) && km > 0) {
      candidatos.push({
        km,
        dataHora: viagemRec.realizado_em,
        origem: "viagem",
      });
    }
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
