import { createClient } from "@/lib/supabase/client";

export async function atualizarChegadaViagem(
  viagemId: string,
  chegadaEm: string | null
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("viagens")
    .update({ chegada_prevista_em: chegadaEm })
    .eq("id", viagemId);
  return error?.message ?? null;
}

export async function atualizarFimViagem(
  viagemId: string,
  fimViagemEm: string | null
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("viagens")
    .update({ fim_viagem_em: fimViagemEm })
    .eq("id", viagemId);
  return error?.message ?? null;
}
