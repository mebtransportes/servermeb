import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CUSTO_CATEGORIA_LABEL,
  type CustoOperacionalCategoria,
  type CustoOperacionalLinha,
  type CustosOperacionaisResumo,
} from "@/lib/custos-operacionais";
import { formatarDataHoraBr, formatarMoeda } from "@/lib/frota-filters";
import { textoValorAbastecimentoFormatado } from "@/lib/abastecimento-valor";

const CATEGORIAS_RELATORIO: CustoOperacionalCategoria[] = [
  "abastecimentos",
  "manutencoes",
  "pedagios",
  "arla",
  "outros",
  "icms",
  "reembolsos",
];

const CATEGORIAS_NO_TOTAL: CustoOperacionalCategoria[] = [
  "abastecimentos",
  "manutencoes",
  "pedagios",
  "arla",
  "outros",
];

function rodape(doc: jsPDF, pagina: number, total: number) {
  const y = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `MEB Gestão de Transporte — Página ${pagina} de ${total}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" }
  );
}

function aplicarRodapes(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    rodape(doc, i, total);
  }
}

function valorCategoria(
  resumo: CustosOperacionaisResumo,
  cat: CustoOperacionalCategoria
): number {
  switch (cat) {
    case "abastecimentos":
      return resumo.abastecimentos;
    case "manutencoes":
      return resumo.manutencoes;
    case "pedagios":
      return resumo.pedagios;
    case "reembolsos":
      return resumo.reembolsos;
    case "arla":
      return resumo.arla;
    case "outros":
      return resumo.outros;
    case "icms":
      return resumo.icms;
  }
}

function detalheResumoCategoria(
  resumo: CustosOperacionaisResumo,
  cat: CustoOperacionalCategoria
): string {
  switch (cat) {
    case "abastecimentos":
      return `Frota ${formatarMoeda(resumo.abastecimentosFrota)} · Viagem ${formatarMoeda(resumo.abastecimentosViagem)}`;
    case "manutencoes":
      return `Preventiva ${formatarMoeda(resumo.manutencoesPreventivas)} · Viagem ${formatarMoeda(resumo.manutencoesViagem)}`;
    case "reembolsos":
      return "Não compõe o total operacional";
    case "icms":
      return "Imposto sobre frete · Não compõe o total operacional";
    case "outros":
      return "Estacionamento, seguro e monitoramento";
    default:
      return "";
  }
}

function cabecalhoRelatorio(
  doc: jsPDF,
  periodoLabel: string,
  resumo: CustosOperacionaisResumo
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Custos Operacionais", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Período: ${periodoLabel}`, 14, 36);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 42);

  const totalLancamentos = CATEGORIAS_RELATORIO.reduce(
    (s, cat) => s + resumo.linhas[cat].length,
    0
  );

  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Resumo do período", 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Categoria", "Detalhe", "Valor"]],
    body: [
      ...CATEGORIAS_NO_TOTAL.map((cat) => [
        CUSTO_CATEGORIA_LABEL[cat],
        detalheResumoCategoria(resumo, cat),
        formatarMoeda(valorCategoria(resumo, cat)),
      ]),
      [
        { content: "TOTAL OPERACIONAL", styles: { fontStyle: "bold" } },
        { content: "Abastecimentos + manutenções + pedágios + arla + outros", styles: { fontStyle: "bold" } },
        { content: formatarMoeda(resumo.total), styles: { fontStyle: "bold" } },
      ],
      [
        CUSTO_CATEGORIA_LABEL.reembolsos,
        detalheResumoCategoria(resumo, "reembolsos"),
        formatarMoeda(resumo.reembolsos),
      ],
      [
        CUSTO_CATEGORIA_LABEL.icms,
        detalheResumoCategoria(resumo, "icms"),
        formatarMoeda(resumo.icms),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 120, 140], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: "auto" },
      2: { halign: "right", cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  });

  const afterTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY;
  y = (afterTable ?? y) + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `${totalLancamentos} lançamento(s) no período · Reembolsos e ICMS listados à parte do total operacional`,
    14,
    y
  );

  return y + 8;
}

function complementoLinhaCustos(l: CustoOperacionalLinha): string {
  const partes = [l.detalhe].filter(Boolean) as string[];
  if (l.valorBruto != null && l.desconto != null && l.desconto > 0) {
    partes.push(
      `Bruto ${formatarMoeda(l.valorBruto)} − Desconto ${formatarMoeda(l.desconto)}`
    );
  }
  return partes.length ? partes.join(" · ") : "—";
}

function formatarValorLinhaCustos(l: CustoOperacionalLinha): string {
  if (l.valorBruto != null && l.desconto != null && l.desconto > 0) {
    return textoValorAbastecimentoFormatado(l.valorBruto, l.desconto);
  }
  return formatarMoeda(l.valor);
}

function secaoCategoria(
  doc: jsPDF,
  startY: number,
  categoria: CustoOperacionalCategoria,
  resumo: CustosOperacionaisResumo
): number {
  const linhas = [...resumo.linhas[categoria]].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
  );
  const total = valorCategoria(resumo, categoria);
  const totalBruto = linhas.reduce((s, l) => s + (l.valorBruto ?? l.valor), 0);
  const totalDesconto = linhas.reduce((s, l) => s + (l.desconto ?? 0), 0);
  const pageH = doc.internal.pageSize.getHeight();
  let y = startY;

  if (y > pageH - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 100, 120);
  doc.text(CUSTO_CATEGORIA_LABEL[categoria], 14, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const extra = detalheResumoCategoria(resumo, categoria);
  const subtotalTexto =
    categoria === "abastecimentos" && totalDesconto > 0
      ? `${linhas.length} lançamento(s) · Bruto ${formatarMoeda(totalBruto)} − Desconto ${formatarMoeda(totalDesconto)} = ${formatarMoeda(total)}`
      : `${linhas.length} lançamento(s) · Subtotal ${formatarMoeda(total)}${extra ? ` · ${extra}` : ""}`;
  doc.text(subtotalTexto, 14, y + 5);

  y += 10;

  if (!linhas.length) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Nenhum lançamento nesta categoria no período selecionado.", 14, y + 4);
    return y + 14;
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Data / hora",
        "Descrição",
        "Origem",
        "Complemento",
        categoria === "abastecimentos" ? "Valor (líquido)" : "Valor",
      ],
    ],
    body: linhas.map((l) => [
      formatarDataHoraBr(l.data),
      l.descricao,
      l.origem,
      complementoLinhaCustos(l),
      formatarValorLinhaCustos(l),
    ]),
    foot: [
      [
        { content: "Subtotal", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatarMoeda(total), styles: { fontStyle: "bold", halign: "right" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    footStyles: { fillColor: [240, 244, 248], textColor: 30 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 28 },
      3: { cellWidth: "auto" },
      4: { halign: "right", cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  return (finalY ?? y) + 10;
}

export function gerarPdfCustosOperacionais(
  resumo: CustosOperacionaisResumo,
  periodoLabel: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  let y = cabecalhoRelatorio(doc, periodoLabel, resumo);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 20;
  }
  doc.text("Detalhamento por categoria", 14, y);
  y += 8;

  for (const cat of CATEGORIAS_RELATORIO) {
    y = secaoCategoria(doc, y, cat, resumo);
  }

  aplicarRodapes(doc);

  const slug = periodoLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`relatorio-custos-operacionais_${slug || "periodo"}.pdf`);
}
