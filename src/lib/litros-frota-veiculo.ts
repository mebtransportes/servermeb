import { createClient } from "@/lib/supabase/client";

export type LitrosTanqueVeiculo = {
  litrosTotais: number;
  dataHora: string;
};

/** Último abastecimento manual em Frota com litros totais registrados. */
export async function fetchLitrosTotaisVeiculo(
  veiculoId: string,
  antesDe?: string
): Promise<LitrosTanqueVeiculo | null> {
  if (!veiculoId) return null;

  const supabase = createClient();
  let query = supabase
    .from("frota_abastecimentos")
    .select("litros_totais, data_hora")
    .eq("veiculo_id", veiculoId)
    .eq("origem", "manual")
    .not("litros_totais", "is", null)
    .gt("litros_totais", 0)
    .order("data_hora", { ascending: false })
    .limit(1);

  if (antesDe) {
    query = query.lte("data_hora", antesDe);
  }

  const { data } = await query.maybeSingle();
  if (!data?.litros_totais) return null;

  const litros = Number(data.litros_totais);
  if (!Number.isFinite(litros) || litros <= 0) return null;

  return {
    litrosTotais: litros,
    dataHora: data.data_hora,
  };
}

