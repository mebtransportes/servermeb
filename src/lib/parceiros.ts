import { createClient } from "@/lib/supabase/client";

export type ParceiroSugestao = {
  id: string;
  tipo: "cliente" | "fornecedor";
  nome: string;
  enderecoLinha: string;
  textoCompleto: string;
};

type ParceiroRow = {
  id: string;
  nome: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
};

function formatarEnderecoLinha(p: ParceiroRow): string {
  const partes = [
    p.logradouro,
    p.numero && `nº ${p.numero}`,
    p.bairro,
    p.cidade && p.estado ? `${p.cidade}/${p.estado}` : p.cidade,
    p.cep && `CEP ${p.cep}`,
  ].filter(Boolean);
  return partes.join(", ") || "Endereço não cadastrado";
}

function toSugestao(p: ParceiroRow, tipo: "cliente" | "fornecedor"): ParceiroSugestao {
  const enderecoLinha = formatarEnderecoLinha(p);
  return {
    id: `${tipo}-${p.id}`,
    tipo,
    nome: p.nome,
    enderecoLinha,
    textoCompleto: `${p.nome} — ${enderecoLinha}`,
  };
}

export async function carregarParceiros(): Promise<ParceiroSugestao[]> {
  const supabase = createClient();
  const [{ data: clientes }, { data: fornecedores }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, logradouro, numero, bairro, cidade, estado, cep")
      .order("nome"),
    supabase
      .from("fornecedores")
      .select("id, nome, logradouro, numero, bairro, cidade, estado, cep")
      .order("nome"),
  ]);

  const lista: ParceiroSugestao[] = [];
  for (const c of clientes ?? []) lista.push(toSugestao(c, "cliente"));
  for (const f of fornecedores ?? []) lista.push(toSugestao(f, "fornecedor"));
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function filtrarParceiros(
  parceiros: ParceiroSugestao[],
  query: string,
  limite = 8
): ParceiroSugestao[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return parceiros
    .filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.enderecoLinha.toLowerCase().includes(q)
    )
    .slice(0, limite);
}
