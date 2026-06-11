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
