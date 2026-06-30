import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AcompanhamentoRelatorioFiltros, AcompanhamentoViagemItem } from "@/lib/acompanhamento-data";
import {
  agruparViagensPorPlaca,
  nomesFornecedoresViagem,
  resumirViagensPorPlaca,
} from "@/lib/acompanhamento-data";
import type { ParceiroSugestao } from "@/lib/parceiros";
import { formatarDataBr, formatarDataHoraBr, formatarMoeda } from "@/lib/frota-filters";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { VINCULO_OPCOES } from "@/lib/viagem-validation";

type DocComAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGEM_X = 12;
const MARGEM_INFERIOR = 16;

function formatarPesoKg(v?: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return "—";
  return `${Number(v).toLocaleString("pt-BR")} kg`;
}

function labelFiltroStatus(status: string) {
  if (!status) return "Todos";
  return VIAGEM_STATUS_LABEL[status] ?? status;
}

function labelFiltroVinculo(vinculo: AcompanhamentoRelatorioFiltros["vinculo"]) {
  if (!vinculo) return "Todos";
  return VINCULO_OPCOES.find((o) => o.value === vinculo)?.label ?? vinculo;
}

function labelFiltroFornecedor(fornecedorId: string, fornecedores: ParceiroSugestao[]) {
  if (!fornecedorId) return "Todos";
  return fornecedores.find((f) => f.id === fornecedorId)?.nome ?? "—";
}

function finalY(doc: DocComAutoTable, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function larguraUtil(doc: jsPDF) {
  return doc.internal.pageSize.getWidth() - MARGEM_X * 2;
}

function rodape(doc: jsPDF, pagina: number, total: number) {
  const y = doc.internal.pageSize.getHeight() - 8;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `MEB Gestão de Transporte — Página ${pagina} de ${total}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" }
  );
}

function linhaViagemTabela(
  v: AcompanhamentoViagemItem,
  fornecedores: ParceiroSugestao[]
) {
  const statusLabel = VIAGEM_STATUS_LABEL[v.status] ?? v.status;
  const dataViagem = v.saida_em ? formatarDataHoraBr(v.saida_em) : "Agendada";
  return [
    nomesFornecedoresViagem(v, fornecedores),
    dataViagem,
    statusLabel,
    v.numero_cte?.trim() || "—",
    v.motorista_nome,
    formatarPesoKg(v.peso_kg),
    v.valor_frete != null && Number(v.valor_frete) > 0
      ? formatarMoeda(Number(v.valor_frete))
      : "—",
  ];
}

const COLUNAS_VIAGEM = [
  "Fornecedor",
  "Data viagem",
  "Status",
  "CT-e",
  "Motorista",
  "Peso",
  "Frete bruto",
];

const ESTILO_TABELA = {
  styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak" as const },
  headStyles: {
    fillColor: [0, 100, 120] as [number, number, number],
    fontSize: 7,
    fontStyle: "bold" as const,
    textColor: 255,
  },
  alternateRowStyles: { fillColor: [248, 251, 252] as [number, number, number] },
  columnStyles: {
    0: { cellWidth: 42 },
    1: { cellWidth: 26 },
    2: { cellWidth: 22 },
    3: { cellWidth: 14 },
    4: { cellWidth: 34 },
    5: { cellWidth: 20 },
    6: { cellWidth: 20 },
  },
  margin: { left: MARGEM_X, right: MARGEM_X, bottom: MARGEM_INFERIOR },
};

function garantirEspaco(doc: jsPDF, y: number, minimo: number) {
  const altura = doc.internal.pageSize.getHeight();
  if (y + minimo > altura - MARGEM_INFERIOR) {
    doc.addPage();
    return 14;
  }
  return y;
}

function desenharTituloPlaca(doc: jsPDF, placa: string, qtd: number, y: number) {
  const w = larguraUtil(doc);
  doc.setFillColor(0, 100, 120);
  doc.roundedRect(MARGEM_X, y, w, 6.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255);
  doc.text(`Placa ${placa}`, MARGEM_X + 2.5, y + 4.5);
  doc.setFontSize(7.5);
  doc.text(`${qtd} viagem(ns)`, MARGEM_X + w - 2.5, y + 4.5, { align: "right" });
  return y + 9;
}

function desenharResumoPlaca(doc: DocComAutoTable, placa: string, y: number, viagens: AcompanhamentoViagemItem[]) {
  const resumo = resumirViagensPorPlaca(viagens);
  y = garantirEspaco(doc, y, 14);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[`Resumo — ${placa}`, "", ""]],
    body: [
      [
        `Viagens: ${resumo.qtdViagens}`,
        `Peso: ${formatarPesoKg(resumo.pesoTotalKg)}`,
        `Faturamento: ${formatarMoeda(resumo.faturamentoBruto)}`,
      ],
    ],
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      fontStyle: "bold",
      textColor: [30, 50, 60],
    },
    headStyles: {
      fillColor: [220, 236, 240],
      textColor: [0, 80, 95],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: { fillColor: [245, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
    },
    margin: { left: MARGEM_X, right: MARGEM_X, bottom: MARGEM_INFERIOR },
  });

  return finalY(doc, y) + 10;
}

function renderSecaoPlaca(
  doc: DocComAutoTable,
  placa: string,
  viagens: AcompanhamentoViagemItem[],
  fornecedores: ParceiroSugestao[],
  startY: number
) {
  let y = garantirEspaco(doc, startY, 28);
  y = desenharTituloPlaca(doc, placa, viagens.length, y);

  autoTable(doc, {
    startY: y,
    head: [COLUNAS_VIAGEM],
    body: viagens.map((v) => linhaViagemTabela(v, fornecedores)),
    ...ESTILO_TABELA,
  });

  y = finalY(doc, y) + 3;
  return desenharResumoPlaca(doc, placa, y, viagens);
}

function cabecalhoRelatorio(
  doc: jsPDF,
  filtros: AcompanhamentoRelatorioFiltros,
  fornecedores: ParceiroSugestao[],
  viagens: AcompanhamentoViagemItem[],
  modoTodasPlacas: boolean
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", MARGEM_X, 14);

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Acompanhamento", MARGEM_X, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80);
  let y = 27;
  const grupos = modoTodasPlacas ? agruparViagensPorPlaca(viagens).length : 0;
  const linhas = [
    `Período: ${formatarDataBr(filtros.de)} até ${formatarDataBr(filtros.ate)}`,
    `Status: ${labelFiltroStatus(filtros.status)} · Fornecedor: ${labelFiltroFornecedor(filtros.fornecedorId, fornecedores)} · Vínculo: ${labelFiltroVinculo(filtros.vinculo)}`,
    modoTodasPlacas
      ? `Placas: ${grupos} veículo(s) · ${viagens.length} viagem(ns) no período`
      : `Placa: ${filtros.placa} · ${viagens.length} viagem(ns)`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
  ];
  for (const linha of linhas) {
    doc.text(linha, MARGEM_X, y);
    y += 4;
  }
  return y + 4;
}

export function gerarPdfAcompanhamentoRelatorio(
  viagens: AcompanhamentoViagemItem[],
  filtros: AcompanhamentoRelatorioFiltros,
  fornecedores: ParceiroSugestao[]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }) as DocComAutoTable;
  const modoTodasPlacas = !filtros.placa;

  let y = cabecalhoRelatorio(doc, filtros, fornecedores, viagens, modoTodasPlacas);

  if (modoTodasPlacas) {
    const grupos = agruparViagensPorPlaca(viagens);
    for (const grupo of grupos) {
      y = renderSecaoPlaca(doc, grupo.placa, grupo.viagens, fornecedores, y);
    }
  } else {
    y = renderSecaoPlaca(doc, filtros.placa, viagens, fornecedores, y);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    rodape(doc, i, total);
  }

  const slug = `${filtros.de}_${filtros.ate}`.replace(/[^\d-]/g, "");
  const sufixo = filtros.placa ? `_${filtros.placa.replace(/[^a-zA-Z0-9]/g, "")}` : "_por-placa";
  doc.save(`relatorio-acompanhamento${sufixo}_${slug}.pdf`);
}
