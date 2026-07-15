export type ParceiroViagemLinha = {
  ordem: number;
  texto: string;
};

/** Junta locais para exibição legada (local_saida / embarque). */
export function formatarLocaisParceiros(itens: ParceiroViagemLinha[]): string {
  return [...itens]
    .sort((a, b) => a.ordem - b.ordem)
    .map((i) => i.texto.trim())
    .filter(Boolean)
    .join(" · ");
}

export function mapFornecedoresDb(
  rows: { ordem: number; local_fornecedor: string }[] | null | undefined
): ParceiroViagemLinha[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((r) => ({ ordem: r.ordem, texto: r.local_fornecedor }));
}

export function mapEntregasDb(
  rows: { ordem: number; local_entrega: string }[] | null | undefined
): ParceiroViagemLinha[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((r) => ({ ordem: r.ordem, texto: r.local_entrega }));
}

/**
 * Extrai "Cidade - UF" do texto salvo do parceiro
 * (formato típico: Nome — Rua, Bairro, Cidade/UF, CEP ...).
 */
export function extrairCidadeEstadoLabel(texto: string | null | undefined): string | null {
  if (!texto?.trim()) return null;
  const matches = [
    ...texto.matchAll(/([^,/—\n]+?)\s*\/\s*([A-Za-z]{2})\b/g),
  ];
  if (!matches.length) return null;
  const ultimo = matches[matches.length - 1];
  const cidade = ultimo[1]
    .replace(/^[\s—\-–]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  const uf = ultimo[2].toUpperCase();
  if (!cidade || !/^[A-Z]{2}$/.test(uf)) return null;
  return `${cidade} - ${uf}`;
}

/** Origem (1º fornecedor/local) → destino (última entrega), só cidade/UF. */
export function formatarOrigemDestinoCidadeEstado(
  origemTexto: string | null | undefined,
  destinoTexto: string | null | undefined
): string {
  const origem = extrairCidadeEstadoLabel(origemTexto);
  const destino = extrairCidadeEstadoLabel(destinoTexto);
  if (!origem && !destino) return "—";
  return `${origem ?? "—"} -> ${destino ?? "—"}`;
}
