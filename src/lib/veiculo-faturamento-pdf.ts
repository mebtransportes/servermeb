import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBr, formatarMoeda } from "@/lib/frota-filters";
import { VEICULO_TIPO_OPCOES, labelVinculo } from "@/lib/viagem-validation";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import type { VeiculoFaturamentoRelatorio, VeiculoFaturamentoSecao } from "@/lib/veiculo-faturamento-relatorio";

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

function yAposTabela(doc: DocComAutoTable, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function garantirEspaco(doc: jsPDF, y: number, minimo = 36) {
  const limite = doc.internal.pageSize.getHeight() - 18;
  if (y + minimo < limite) return y;
  doc.addPage();
  return 16;
}

function labelTipo(tipo: VeiculoFaturamentoSecao["tipo"]) {
  return VEICULO_TIPO_OPCOES.find((o) => o.value === tipo)?.label ?? tipo;
}

function labelStatus(status: string) {
  if (!status) return "—";
  return VIAGEM_STATUS_LABEL[status] ?? status;
}

function periodoTexto(relatorio: VeiculoFaturamentoRelatorio) {
  if (relatorio.de && relatorio.ate) {
    return `${relatorio.periodoLabel} (${formatarDataBr(relatorio.de)} a ${formatarDataBr(relatorio.ate)})`;
  }
  return relatorio.periodoLabel;
}

export function gerarPdfFaturamentoVeiculos(relatorio: VeiculoFaturamentoRelatorio) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }) as DocComAutoTable;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("M&B Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de faturamento bruto por veículo", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Período: ${periodoTexto(relatorio)}`, 14, 36);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 42);

  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Filtros e resumo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const resumo = [
    `Vínculo: ${relatorio.vinculoLabel}`,
    `Veículos: ${relatorio.placasLabel}`,
    `Veículos no relatório: ${relatorio.secoes.length}`,
    `Viagens: ${relatorio.qtdViagensUnicas}`,
    `Faturamento bruto geral: ${formatarMoeda(relatorio.totalGeralUnico)}`,
    "Valor usado: frete bruto da viagem (sem ICMS, comissão ou encargos).",
    "Apenas caminhões e cavalos. Carretas não entram no faturamento.",
  ];
  resumo.forEach((linha) => {
    doc.text(linha, 14, y);
    y += 5;
  });

  autoTable(doc, {
    startY: y + 2,
    head: [["Placa", "Veículo", "Tipo", "Vínculo", "Viagens", "Faturamento bruto"]],
    body: relatorio.secoes.length
      ? relatorio.secoes.map((s) => [
          s.placa,
          s.nome,
          labelTipo(s.tipo),
          labelVinculo(s.vinculo),
          String(s.viagens.length),
          formatarMoeda(s.totalBruto),
        ])
      : [["—", "Nenhum veículo no filtro", "", "", "", ""]],
    foot: [
      [
        {
          content: "Total geral (viagens únicas)",
          colSpan: 5,
          styles: { halign: "right", fontStyle: "bold" },
        },
        { content: formatarMoeda(relatorio.totalGeralUnico), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [0, 120, 140], textColor: 255 },
    footStyles: { fillColor: [230, 242, 245], textColor: 30 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  y = yAposTabela(doc, y) + 10;

  for (const secao of relatorio.secoes) {
    y = garantirEspaco(doc, y, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 100, 120);
    doc.text(
      `${secao.placa} — ${secao.nome} · ${labelTipo(secao.tipo)} · ${labelVinculo(secao.vinculo)}`,
      14,
      y
    );
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70);
    doc.text(`Total bruto do veículo: ${formatarMoeda(secao.totalBruto)}`, 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Data de saída", "CT-e", "Motorista", "Cliente", "Status", "Frete bruto"]],
      body: secao.viagens.length
        ? secao.viagens.map((v) => [
            v.saidaEm ? formatarDataBr(v.saidaEm) : "—",
            v.numeroCte?.trim() || "—",
            v.motorista,
            v.cliente,
            labelStatus(v.status),
            formatarMoeda(v.valorFrete),
          ])
        : [["—", "Nenhuma viagem no período", "", "", "", ""]],
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [0, 120, 140], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 248, 250] },
      columnStyles: {
        5: { halign: "right", cellWidth: 32 },
      },
      margin: { left: 14, right: 14 },
    });

    y = yAposTabela(doc, y) + 4;

    if (secao.porCliente.length) {
      y = garantirEspaco(doc, y, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text("Por cliente", 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [["Cliente", "Viagens", "Faturamento bruto"]],
        body: secao.porCliente.map((c) => [
          c.cliente,
          String(c.qtdViagens),
          formatarMoeda(c.total),
        ]),
        foot: [
          [
            { content: "Total do veículo", styles: { fontStyle: "bold" } },
            { content: String(secao.viagens.length), styles: { fontStyle: "bold", halign: "right" } },
            { content: formatarMoeda(secao.totalBruto), styles: { fontStyle: "bold", halign: "right" } },
          ],
        ],
        styles: { fontSize: 8, cellPadding: 1.6 },
        headStyles: { fillColor: [70, 90, 110], textColor: 255 },
        footStyles: { fillColor: [230, 242, 245], textColor: 30 },
        columnStyles: {
          1: { halign: "right", cellWidth: 24 },
          2: { halign: "right", cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      });
      y = yAposTabela(doc, y) + 10;
    } else {
      y += 8;
    }
  }

  aplicarRodapes(doc);
  const sufixo =
    relatorio.de && relatorio.ate ? `${relatorio.de}_${relatorio.ate}` : "todos";
  doc.save(`faturamento-veiculos_${sufixo}.pdf`);
}
