import { formatarMoeda } from "@/lib/frota-filters";

/** Valor do desconto lançado (0 se ausente ou inválido). */
export function abastecimentoDesconto(valorDesconto?: number | null): number {
  const d = Number(valorDesconto) || 0;
  return d > 0 ? d : 0;
}

/** Valor efetivo de abastecimento: bruto − desconto. */
export function abastecimentoValorLiquidoFromBruto(
  valorBruto: number,
  valorDesconto?: number | null
): number {
  const bruto = Number(valorBruto) || 0;
  const desconto = abastecimentoDesconto(valorDesconto);
  if (desconto <= 0) return bruto;
  return Math.max(0, Math.round((bruto - desconto) * 100) / 100);
}

export type AbastecimentoValorPartes = {
  valorBruto: number;
  desconto: number;
  valorLiquido: number;
};

export function partesValorAbastecimento(
  valorBruto: number,
  valorDesconto?: number | null
): AbastecimentoValorPartes {
  const bruto = Number(valorBruto) || 0;
  const desconto = abastecimentoDesconto(valorDesconto);
  return {
    valorBruto: bruto,
    desconto,
    valorLiquido: abastecimentoValorLiquidoFromBruto(bruto, desconto),
  };
}

/** Valor que entra em totais de `viagem_recursos` (líquido para abastecimento). */
export function valorLiquidoRecursoViagem(r: {
  tipo: string;
  valor: number;
  valor_desconto_combustivel?: number | null;
}): number {
  if (r.tipo !== "abastecimento") return Number(r.valor) || 0;
  return abastecimentoValorLiquidoFromBruto(
    Number(r.valor) || 0,
    r.valor_desconto_combustivel
  );
}

export function textoValorAbastecimentoFormatado(
  valorBruto: number,
  valorDesconto?: number | null,
  formatar = formatarMoeda
): string {
  const { desconto, valorLiquido, valorBruto: bruto } = partesValorAbastecimento(
    valorBruto,
    valorDesconto
  );
  if (desconto > 0) {
    return `${formatar(bruto)} − ${formatar(desconto)} = ${formatar(valorLiquido)}`;
  }
  return formatar(valorLiquido);
}

export function textoResumoAbastecimentos(
  itens: { valor: number; valorBruto?: number; desconto?: number }[],
  formatar = formatarMoeda
): string {
  const liquido = itens.reduce((s, i) => s + i.valor, 0);
  const bruto = itens.reduce((s, i) => s + (i.valorBruto ?? i.valor), 0);
  const desconto = itens.reduce((s, i) => s + (i.desconto ?? 0), 0);
  if (desconto > 0) {
    return `Valor líquido: ${formatar(liquido)} (bruto ${formatar(bruto)} − desconto ${formatar(desconto)})`;
  }
  return `Valor total: ${formatar(liquido)}`;
}
