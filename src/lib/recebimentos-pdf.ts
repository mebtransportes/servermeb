import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBr, formatarMoeda, dataNoIntervalo } from "@/lib/frota-filters";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import type { RecebimentoViagemRelatorioLinha } from "@/lib/recebimentos-viagens-relatorio";
import {
  calcularTotalAReceber,
  RECEBIMENTO_ENCARGO_LABEL,
  RECEBIMENTO_ENCARGO_STATUS_LABEL,
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoEncargoStatus,
  type RecebimentoStatus,
  type ViagemRecebimentoEncargo,
} from "@/types/recebimento";

export type EncargoRelatorioLinha = {
  encargo: ViagemRecebimentoEncargo;
  recebimento: RecebimentoComCanhotos;
};

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

function resumirPorStatus(itens: RecebimentoComCanhotos[]) {
  let pendente = 0;
  let pago = 0;
  let vencido = 0;
  let total = 0;
  let freteBruto = 0;
  let freteLiquido = 0;
  for (const item of itens) {
    const valor = calcularTotalAReceber(item);
    total += valor;
    freteBruto += Number(item.valor_frete_total) || 0;
    freteLiquido += Number(item.valor_frete_liquido) || 0;
    if (item.status === "pago") pago += valor;
    else if (item.status === "vencido") vencido += valor;
    else pendente += valor;
  }
  return { pendente, pago, vencido, total, freteBruto, freteLiquido };
}

function cabecalhoRelatorio(
  doc: jsPDF,
  de: string,
  ate: string,
  statusLabel: string,
  resumo: ReturnType<typeof resumirPorStatus>,
  qtd: number,
  tituloRelatorio: string,
  fornecedorLabel?: string
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(tituloRelatorio, 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Período: ${formatarDataBr(de)} até ${formatarDataBr(ate)}`, 14, 36);
  doc.text(`Status: ${statusLabel}`, 14, 42);
  let y = 48;
  if (fornecedorLabel) {
    doc.text(`Fornecedor: ${fornecedorLabel}`, 14, y);
    y += 6;
  }
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Resumo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  [
    `Total de registros: ${qtd}`,
    `Frete bruto total: ${formatarMoeda(resumo.freteBruto)}`,
    `Frete líquido total (sem ICMS): ${formatarMoeda(resumo.freteLiquido)}`,
    `Pendente: ${formatarMoeda(resumo.pendente)}`,
    `Pago: ${formatarMoeda(resumo.pago)}`,
    `Vencido: ${formatarMoeda(resumo.vencido)}`,
    `Total a receber com encargos: ${formatarMoeda(resumo.total)}`,
  ].forEach((linha) => {
    doc.text(linha, 14, y);
    y += 5;
  });
  return y + 4;
}

export function gerarPdfRecebimentos(
  itens: RecebimentoComCanhotos[],
  de: string,
  ate: string,
  statusLabel: string,
  options?: { titulo?: string; arquivoSlug?: string; fornecedorLabel?: string }
) {
  const titulo = options?.titulo ?? "Relatório de Recebimentos";
  const slug = options?.arquivoSlug ?? "recebimentos";
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const resumo = resumirPorStatus(itens);
  const startY = cabecalhoRelatorio(
    doc,
    de,
    ate,
    statusLabel,
    resumo,
    itens.length,
    titulo,
    options?.fornecedorLabel
  );

  const body = itens.map((item) => {
    const total = calcularTotalAReceber(item);
    const dataRef = item.data_recebimento ?? item.created_at ?? "";
    return [
      item.motorista_nome,
      item.numero_cte?.trim() || "—",
      item.veiculos_placas,
      item.empresa,
      formatarMoeda(item.valor_frete_total),
      formatarMoeda(item.valor_frete_liquido),
      formatarMoeda(item.valor_descargas_adicionais || 0),
      formatarMoeda(item.valor_diarias || 0),
      formatarMoeda(total),
      dataRef ? formatarDataBr(dataRef) : "—",
      RECEBIMENTO_STATUS_LABEL[item.status],
      item.observacao?.trim() || "—",
    ];
  });

  autoTable(doc, {
    startY,
    head: [
      [
        "Motorista",
        "CTE",
        "Placas",
        "Fornecedor",
        "Frete bruto",
        "Frete líquido (sem ICMS)",
        "Descargas",
        "Diárias",
        "Total c/ encargos",
        "Data receb.",
        "Status",
        "Observação",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [0, 100, 120], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 28 },
      11: { cellWidth: 32 },
    },
  });

  aplicarRodapes(doc);
  doc.save(`relatorio-recebimentos-${slug}_${de}_${ate}.pdf`);
}

export function filtrarRecebimentosRelatorio(
  itens: RecebimentoComCanhotos[],
  de: string,
  ate: string,
  status: RecebimentoStatus | "todos",
  fornecedor?: string
): RecebimentoComCanhotos[] {
  return itens.filter((item) => {
    if (status !== "todos" && item.status !== status) return false;
    if (fornecedor && item.empresa !== fornecedor) return false;
    const dataRef = item.data_recebimento ?? item.created_at ?? "";
    if (!dataRef) return false;
    const ref = dataRef.includes("T") ? dataRef : `${dataRef}T12:00:00`;
    return dataNoIntervalo(ref, de, ate);
  });
}

function resumirEncargos(linhas: EncargoRelatorioLinha[]) {
  let semData = 0;
  let pendente = 0;
  let pago = 0;
  let total = 0;
  for (const { encargo } of linhas) {
    const v = Number(encargo.valor) || 0;
    total += v;
    if (encargo.status === "pago") pago += v;
    else if (encargo.status === "pendente") pendente += v;
    else semData += v;
  }
  return { semData, pendente, pago, total, qtd: linhas.length };
}

function cabecalhoRelatorioEncargos(
  doc: jsPDF,
  de: string,
  ate: string,
  statusLabel: string,
  resumo: ReturnType<typeof resumirEncargos>,
  fornecedorLabel?: string
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Encargos", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Período: ${formatarDataBr(de)} até ${formatarDataBr(ate)}`, 14, 36);
  doc.text(`Status recebimento: ${statusLabel}`, 14, 42);
  let y = 48;
  if (fornecedorLabel) {
    doc.text(`Fornecedor: ${fornecedorLabel}`, 14, y);
    y += 6;
  }
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Resumo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  [
    `Total de encargos: ${resumo.qtd}`,
    `Sem data: ${formatarMoeda(resumo.semData)}`,
    `Pendente: ${formatarMoeda(resumo.pendente)}`,
    `Pago: ${formatarMoeda(resumo.pago)}`,
    `Valor total: ${formatarMoeda(resumo.total)}`,
  ].forEach((linha) => {
    doc.text(linha, 14, y);
    y += 5;
  });
  return y + 4;
}

export function filtrarEncargosRelatorio(
  itens: RecebimentoComCanhotos[],
  de: string,
  ate: string,
  status: RecebimentoStatus | "todos",
  fornecedor?: string
): EncargoRelatorioLinha[] {
  const linhas: EncargoRelatorioLinha[] = [];
  for (const recebimento of itens) {
    if (status !== "todos" && recebimento.status !== status) continue;
    if (fornecedor && recebimento.empresa !== fornecedor) continue;
    for (const encargo of recebimento.encargos) {
      const dataRef =
        encargo.data_recebimento ?? encargo.created_at ?? recebimento.created_at ?? "";
      if (!dataRef) continue;
      const ref = dataRef.includes("T") ? dataRef : `${dataRef}T12:00:00`;
      if (!dataNoIntervalo(ref, de, ate)) continue;
      linhas.push({ encargo, recebimento });
    }
  }
  return linhas;
}

export function gerarPdfEncargosRecebimentos(
  linhas: EncargoRelatorioLinha[],
  de: string,
  ate: string,
  statusLabel: string,
  options?: { arquivoSlug?: string; fornecedorLabel?: string }
) {
  const slug = options?.arquivoSlug ?? "encargos";
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const resumo = resumirEncargos(linhas);
  const startY = cabecalhoRelatorioEncargos(
    doc,
    de,
    ate,
    statusLabel,
    resumo,
    options?.fornecedorLabel
  );

  const body = linhas.map(({ encargo, recebimento }) => {
    const dataRef = encargo.data_recebimento ?? encargo.created_at ?? "";
    return [
      recebimento.motorista_nome,
      recebimento.numero_cte?.trim() || "—",
      encargo.numero_cte?.trim() || "—",
      recebimento.empresa,
      RECEBIMENTO_ENCARGO_LABEL[encargo.tipo],
      formatarMoeda(encargo.valor),
      dataRef ? formatarDataBr(dataRef.split("T")[0]) : "—",
      RECEBIMENTO_ENCARGO_STATUS_LABEL[encargo.status],
      recebimento.veiculos_placas,
    ];
  });

  autoTable(doc, {
    startY,
    head: [
      [
        "Motorista",
        "CTE viagem",
        "CTE encargo",
        "Fornecedor",
        "Tipo",
        "Valor",
        "Data receb.",
        "Status encargo",
        "Placas",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [0, 100, 120], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 30 },
      8: { cellWidth: 18 },
    },
  });

  aplicarRodapes(doc);
  doc.save(`relatorio-encargos-${slug}_${de}_${ate}.pdf`);
}

function resumirLinhasViagens(linhas: RecebimentoViagemRelatorioLinha[]) {
  let freteBruto = 0;
  let descargas = 0;
  let diarias = 0;
  let total = 0;
  for (const l of linhas) {
    freteBruto += l.frete_bruto;
    descargas += l.descargas;
    diarias += l.diarias;
    total += l.total_com_encargos;
  }
  return { freteBruto, descargas, diarias, total, qtd: linhas.length };
}

function cabecalhoRelatorioViagensSaida(
  doc: jsPDF,
  de: string,
  ate: string,
  resumo: ReturnType<typeof resumirLinhasViagens>,
  fornecedorLabel?: string
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Viagens por Saída", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Período (data de saída): ${formatarDataBr(de)} até ${formatarDataBr(ate)}`,
    14,
    36
  );
  let y = 42;
  if (fornecedorLabel) {
    doc.text(`Fornecedor: ${fornecedorLabel}`, 14, y);
    y += 6;
  }
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Resumo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  [
    `Total de viagens: ${resumo.qtd}`,
    `Frete bruto: ${formatarMoeda(resumo.freteBruto)}`,
    `Descargas: ${formatarMoeda(resumo.descargas)}`,
    `Diárias: ${formatarMoeda(resumo.diarias)}`,
    `Total c/ encargos: ${formatarMoeda(resumo.total)}`,
  ].forEach((linha) => {
    doc.text(linha, 14, y);
    y += 5;
  });
  return y + 4;
}

export function gerarPdfRecebimentosViagensSaida(
  linhas: RecebimentoViagemRelatorioLinha[],
  de: string,
  ate: string,
  options?: { fornecedorLabel?: string }
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const resumo = resumirLinhasViagens(linhas);
  const startY = cabecalhoRelatorioViagensSaida(
    doc,
    de,
    ate,
    resumo,
    options?.fornecedorLabel
  );

  const body = linhas.map((l) => [
    l.motorista_nome,
    l.numero_cte?.trim() || "—",
    l.placas,
    l.fornecedor,
    formatarMoeda(l.frete_bruto),
    formatarMoeda(l.descargas),
    formatarMoeda(l.diarias),
    formatarMoeda(l.total_com_encargos),
    l.data_recebimento ? formatarDataBr(l.data_recebimento) : "—",
    l.status_viagem,
  ]);

  autoTable(doc, {
    startY,
    head: [
      [
        "Motorista",
        "CTE",
        "Placas",
        "Fornecedor",
        "Frete bruto",
        "Descargas",
        "Diárias",
        "Total c/ encargos",
        "Data receb.",
        "Status",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [0, 100, 120], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 30 },
      9: { cellWidth: 24 },
    },
  });

  aplicarRodapes(doc);
  doc.save(`relatorio-viagens-saida_${de}_${ate}.pdf`);
}
