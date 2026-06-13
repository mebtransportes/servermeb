import { createClient } from "@/lib/supabase/client";

export type FechamentoAdiantamento = {
  id: string;
  viagem_id: string;
  valor: number;
  descricao?: string | null;
  realizado_em: string;
};

/** Adiantamentos de salário (tipo adiantamento), agrupados por viagem. */
export async function fetchAdiantamentosPorViagens(
  viagemIds: string[]
): Promise<Map<string, FechamentoAdiantamento[]>> {
  const porViagem = new Map<string, FechamentoAdiantamento[]>();
  if (!viagemIds.length) return porViagem;

  const supabase = createClient();
  const { data: recursos, error } = await supabase
    .from("viagem_recursos")
    .select("id, viagem_id, valor, descricao, realizado_em")
    .in("viagem_id", viagemIds)
    .eq("tipo", "adiantamento")
    .order("realizado_em", { ascending: true });

  if (error) {
    console.warn(error.message);
    return porViagem;
  }

  for (const r of recursos ?? []) {
    const item: FechamentoAdiantamento = {
      id: r.id,
      viagem_id: r.viagem_id,
      valor: Number(r.valor) || 0,
      descricao: r.descricao,
      realizado_em: r.realizado_em,
    };
    const lista = porViagem.get(r.viagem_id) ?? [];
    lista.push(item);
    porViagem.set(r.viagem_id, lista);
  }

  return porViagem;
}
