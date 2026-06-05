import { createClient } from "@/lib/supabase/client";

export async function fetchLitrosAbastecimentoInicial(
  viagemId: string
): Promise<number | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("viagem_recursos")
    .select("litros")
    .eq("viagem_id", viagemId)
    .eq("abastecimento_inicial", true)
    .maybeSingle();

  if (!data?.litros) return null;
  const litros = Number(data.litros);
  return Number.isFinite(litros) && litros > 0 ? litros : null;
}

export async function upsertAbastecimentoInicial(
  viagemId: string,
  litros: number,
  saidaEm: string
): Promise<string | null> {
  const supabase = createClient();

  const { data: existente } = await supabase
    .from("viagem_recursos")
    .select("id")
    .eq("viagem_id", viagemId)
    .eq("abastecimento_inicial", true)
    .maybeSingle();

  const payload = {
    viagem_id: viagemId,
    tipo: "abastecimento" as const,
    valor: 0,
    litros,
    descricao: "Abastecimento inicial (cadastro da viagem)",
    realizado_em: new Date(saidaEm).toISOString(),
    abastecimento_inicial: true,
  };

  if (existente?.id) {
    const { error } = await supabase
      .from("viagem_recursos")
      .update(payload)
      .eq("id", existente.id);
    return error?.message ?? null;
  }

  const { error } = await supabase.from("viagem_recursos").insert(payload);
  return error?.message ?? null;
}
