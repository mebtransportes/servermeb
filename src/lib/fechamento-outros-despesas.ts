import { createClient } from "@/lib/supabase/client";

export type FechamentoOutroDespesaAnexo = {
  id?: string;
  label: string;
  storage_path: string;
};

export type FechamentoOutroDespesa = {
  id: string;
  viagem_id: string;
  nome: string;
  valor: number;
  realizado_em: string;
  anexos: FechamentoOutroDespesaAnexo[];
};

type RecursoOutroRow = {
  id: string;
  viagem_id: string;
  valor: number;
  descricao?: string | null;
  realizado_em: string;
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
};

function montarAnexosRecurso(
  recurso: RecursoOutroRow,
  anexosExtra: { id: string; file_name: string; storage_path: string; nome?: string }[]
): FechamentoOutroDespesaAnexo[] {
  const lista: FechamentoOutroDespesaAnexo[] = [];

  if (recurso.nota_fiscal_path) {
    lista.push({
      label: recurso.nota_fiscal_nome?.trim() || "Nota fiscal",
      storage_path: recurso.nota_fiscal_path,
    });
  }
  if (recurso.comprovante_path) {
    lista.push({
      label: recurso.comprovante_nome?.trim() || "Comprovante",
      storage_path: recurso.comprovante_path,
    });
  }
  for (const a of anexosExtra) {
    lista.push({
      id: a.id,
      label: a.file_name?.trim() || a.nome?.trim() || "Anexo",
      storage_path: a.storage_path,
    });
  }
  return lista;
}

/** Despesas personalizadas (tipo outro) com nome e anexos, agrupadas por viagem. */
export async function fetchOutrosDespesasPorViagens(
  viagemIds: string[]
): Promise<Map<string, FechamentoOutroDespesa[]>> {
  const porViagem = new Map<string, FechamentoOutroDespesa[]>();
  if (!viagemIds.length) return porViagem;

  const supabase = createClient();
  const { data: recursos, error } = await supabase
    .from("viagem_recursos")
    .select(
      "id, viagem_id, valor, descricao, realizado_em, nota_fiscal_path, nota_fiscal_nome, comprovante_path, comprovante_nome"
    )
    .in("viagem_id", viagemIds)
    .eq("tipo", "outro")
    .order("realizado_em", { ascending: true });

  if (error) {
    console.warn(error.message);
    return porViagem;
  }

  const rows = (recursos ?? []) as RecursoOutroRow[];
  const recursoIds = rows.map((r) => r.id);

  const anexosPorRecurso = new Map<
    string,
    { id: string; file_name: string; storage_path: string; nome?: string }[]
  >();

  if (recursoIds.length) {
    const { data: anexos } = await supabase
      .from("viagem_anexos")
      .select("id, recurso_id, file_name, storage_path, nome")
      .in("recurso_id", recursoIds);

    for (const a of anexos ?? []) {
      if (!a.recurso_id) continue;
      const lista = anexosPorRecurso.get(a.recurso_id) ?? [];
      lista.push({
        id: a.id,
        file_name: a.file_name,
        storage_path: a.storage_path,
        nome: a.nome ?? undefined,
      });
      anexosPorRecurso.set(a.recurso_id, lista);
    }
  }

  for (const r of rows) {
    const item: FechamentoOutroDespesa = {
      id: r.id,
      viagem_id: r.viagem_id,
      nome: r.descricao?.trim() || "Outros",
      valor: Number(r.valor) || 0,
      realizado_em: r.realizado_em,
      anexos: montarAnexosRecurso(r, anexosPorRecurso.get(r.id) ?? []),
    };
    const lista = porViagem.get(r.viagem_id) ?? [];
    lista.push(item);
    porViagem.set(r.viagem_id, lista);
  }

  return porViagem;
}
