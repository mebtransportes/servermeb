import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CustoPostoGrupo, CustosPostosResumo } from "@/lib/custos-operacionais";
import { formatarDataHoraBr, formatarMoeda } from "@/lib/frota-filters";

type DocComAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function rodape(doc: jsPDF, pagina: number, total: number) {
  const y = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `M&B Gestão de Transporte — Página ${pagina} de ${total}`,
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

function finalY(doc: DocComAutoTable, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function garantirEspaco(doc: jsPDF, y: number, minimo = 34) {
  const limite = doc.internal.pageSize.getHeight() - 18;
  if (y + minimo < limite) return y;
  doc.addPage();
  return 16;
}

function resumoCabecalho(doc: DocComAutoTable, periodoLabel: string, resumo: CustosPostosResumo) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("M&B Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Custos de Postos", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Período: ${periodoLabel}`, 14, 36);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 42);

  autoTable(doc, {
    startY: 50,
    head: [["Resumo", "Quantidade", "Total"]],
    body: [
      ["Abastecimentos", String(resumo.abastecimentos.length), formatarMoeda(resumo.total)],
      ["Postos", String(resumo.postos.length), `${resumo.litros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} L`],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 120, 140], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles: {
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 38 },
    },
    margin: { left: 14, right: 14 },
  });

  return finalY(doc, 50) + 12;
}

function secaoPosto(doc: DocComAutoTable, grupo: CustoPostoGrupo, startY: number) {
  const y = garantirEspaco(doc, startY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 100, 120);
  doc.text(grupo.posto, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    `${grupo.abastecimentos.length} abastecimento(s) · ${grupo.litros.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })} L · Total ${formatarMoeda(grupo.total)}`,
    14,
    y + 5
  );

  autoTable(doc, {
    startY: y + 10,
    head: [["Data / hora", "Caminhão / cavalo", "CT-e", "Combustível", "Origem", "Litros", "Valor"]],
    body: grupo.abastecimentos.map((item) => [
      formatarDataHoraBr(item.data),
      `${item.veiculo} — ${item.placa}`,
      item.cte,
      item.combustivel,
      item.origem,
      item.litros > 0
        ? `${item.litros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} L`
        : "—",
      formatarMoeda(item.valor),
    ]),
    foot: [
      [
        { content: "Subtotal do posto", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        {
          content: `${grupo.litros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} L`,
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: formatarMoeda(grupo.total), styles: { fontStyle: "bold", halign: "right" } },
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 1.6 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    footStyles: { fillColor: [240, 244, 248], textColor: 30 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 52 },
      2: { cellWidth: 24 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  return finalY(doc, y + 10) + 10;
}

export function gerarPdfCustosPostos(
  resumo: CustosPostosResumo,
  periodoLabel: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }) as DocComAutoTable;
  let y = resumoCabecalho(doc, periodoLabel, resumo);

  for (const grupo of resumo.postos) {
    y = secaoPosto(doc, grupo, y);
  }

  aplicarRodapes(doc);
  const slug = periodoLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`relatorio-custos-postos_${slug || "periodo"}.pdf`);
}
