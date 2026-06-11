export type ManutencaoPagamentoModalidade = "A_VISTA" | "A_PRAZO";
export type ManutencaoPagamentoForma =
  | "DINHEIRO"
  | "PIX"
  | "DEPOSITO"
  | "CHEQUE"
  | "CARTAO";

export type ManutencaoParcelaInput = {
  numero: number;
  valor: string;
  dataVencimento: string;
};

export type ManutencaoParcela = {
  numero: number;
  valor: number;
  dataVencimento: string;
};

export const PAGAMENTO_MODALIDADE_OPCOES: {
  value: ManutencaoPagamentoModalidade;
  label: string;
}[] = [
  { value: "A_VISTA", label: "À vista" },
  { value: "A_PRAZO", label: "A prazo (parcelado)" },
];

export const PAGAMENTO_FORMA_OPCOES: {
  value: ManutencaoPagamentoForma;
  label: string;
}[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARTAO", label: "Cartão" },
];

export function labelPagamentoForma(forma?: string | null): string {
  return PAGAMENTO_FORMA_OPCOES.find((o) => o.value === forma)?.label ?? "—";
}

export function labelPagamentoModalidade(mod?: string | null): string {
  return PAGAMENTO_MODALIDADE_OPCOES.find((o) => o.value === mod)?.label ?? "—";
}

export function criarParcelasVazias(qtd: number, valorTotal = 0): ManutencaoParcelaInput[] {
  const n = Math.max(1, Math.min(48, qtd));
  const base = n > 0 ? Math.floor((valorTotal / n) * 100) / 100 : 0;
  let resto = Math.round((valorTotal - base * n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => {
    const extra = resto >= 0.01 ? 0.01 : 0;
    if (extra) resto = Math.round((resto - extra) * 100) / 100;
    const v = Math.round((base + extra) * 100) / 100;
    return {
      numero: i + 1,
      valor: v > 0 ? v.toFixed(2).replace(".", ",") : "",
      dataVencimento: "",
    };
  });
}

export function formatarDataBrCurta(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function resumoPagamentoManutencao(opts: {
  modalidade?: string | null;
  forma?: string | null;
  vencimento?: string | null;
  parcelas?: ManutencaoParcela[];
}): string {
  if (!opts.modalidade || !opts.forma) return "";
  const forma = labelPagamentoForma(opts.forma);
  if (opts.modalidade === "A_VISTA") {
    const dt = opts.vencimento ? formatarDataBrCurta(opts.vencimento) : "—";
    return `${forma} · à vista · venc. ${dt}`;
  }
  const parcelas = opts.parcelas ?? [];
  if (!parcelas.length) return `${forma} · a prazo`;
  const proxima = [...parcelas].sort(
    (a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  )[0];
  return `${forma} · ${parcelas.length}x · próx. ${formatarDataBrCurta(proxima.dataVencimento)}`;
}

export function validarPagamentoManutencao(opts: {
  modalidade: ManutencaoPagamentoModalidade | "";
  forma: ManutencaoPagamentoForma | "";
  vencimentoAvista: string;
  parcelas: ManutencaoParcelaInput[];
  valorTotal: number;
  parseValor: (s: string) => number | null;
}): string | null {
  if (!opts.modalidade) return "Selecione a modalidade de pagamento";
  if (!opts.forma) return "Selecione a forma de pagamento";
  if (opts.modalidade === "A_VISTA") {
    if (!opts.vencimentoAvista) return "Informe a data de pagamento";
    return null;
  }
  if (!opts.parcelas.length) return "Informe ao menos uma parcela";
  for (const p of opts.parcelas) {
    if (!p.dataVencimento) return `Informe o vencimento da parcela ${p.numero}`;
    const v = opts.parseValor(p.valor);
    if (v == null || v <= 0) return `Informe o valor da parcela ${p.numero}`;
  }
  const soma = opts.parcelas.reduce((s, p) => s + (opts.parseValor(p.valor) ?? 0), 0);
  if (opts.valorTotal > 0 && Math.abs(soma - opts.valorTotal) > 0.02) {
    return `A soma das parcelas difere do valor total da manutenção`;
  }
  return null;
}

export function textoParcelasManutencao(parcelas: ManutencaoParcela[]): string {
  if (!parcelas.length) return "—";
  return parcelas
    .sort((a, b) => a.numero - b.numero)
    .map(
      (p) =>
        `${p.numero}ª R$ ${p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${formatarDataBrCurta(p.dataVencimento)})`
    )
    .join(" · ");
}
