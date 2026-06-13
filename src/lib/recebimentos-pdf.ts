import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBr, formatarMoeda, dataNoIntervalo } from "@/lib/frota-filters";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import {
  calcularTotalAReceber,
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoStatus,
} from "@/types/recebimento";

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
  for (const item of itens) {
    const valor = calcularTotalAReceber(item);
    total += valor;
    if (item.status === "pago") pago += valor;
    else if (item.status === "vencido") vencido += valor;
    else pendente += valor;
  }
  return { pendente, pago, vencido, total };
}

function cabecalhoRelatorio(
  doc: jsPDF,
  de: string,
  ate: string,
  statusLabel: string,
  resumo: ReturnType<typeof resumirPorStatus>,
  qtd: number,
  tituloRelatorio: string
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
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 48);

  let y = 56;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Resumo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  [
    `Total de registros: ${qtd}`,
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
  options?: { titulo?: string; arquivoSlug?: string }
) {
  const titulo = options?.titulo ?? "Relatório de Recebimentos";
  const slug = options?.arquivoSlug ?? "recebimentos";
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const resumo = resumirPorStatus(itens);
  const startY = cabecalhoRelatorio(doc, de, ate, statusLabel, resumo, itens.length, titulo);

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
        "Frete total",
        "Frete líq. s/ enc. e imp.",
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
  status: RecebimentoStatus | "todos"
): RecebimentoComCanhotos[] {
  return itens.filter((item) => {
    if (status !== "todos" && item.status !== status) return false;
    const dataRef = item.data_recebimento ?? item.created_at ?? "";
    if (!dataRef) return false;
    const ref = dataRef.includes("T") ? dataRef : `${dataRef}T12:00:00`;
    return dataNoIntervalo(ref, de, ate);
  });
}
