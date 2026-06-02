import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ManutencaoCard, AbastecimentoCard } from "@/types/frota";
import { formatarMoeda, formatarDataBr, formatarDataHoraBr } from "@/lib/frota-filters";

function textoAnexo(sim: boolean) {
  return sim ? "Sim" : "—";
}

function formatarKm(km?: number | null) {
  if (km == null) return "—";
  return km.toLocaleString("pt-BR");
}

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

function cabecalhoRelatorio(
  doc: jsPDF,
  titulo: string,
  de: string,
  ate: string,
  resumo: string[]
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(titulo, 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Período: ${formatarDataBr(de)} até ${formatarDataBr(ate)}`,
    14,
    36
  );
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 42);

  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Resumo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  resumo.forEach((linha) => {
    doc.text(linha, 14, y);
    y += 5;
  });
  return y + 4;
}

export function gerarPdfManutencao(
  itens: ManutencaoCard[],
  de: string,
  ate: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const totalValor = itens.reduce((s, i) => s + i.valor, 0);
  const preventivas = itens.filter((i) => i.source === "preventiva").length;
  const viagens = itens.filter((i) => i.source === "viagem").length;

  const startY = cabecalhoRelatorio(doc, "Relatório de Manutenção", de, ate, [
    `Total de registros: ${itens.length}`,
    `Valor total: ${formatarMoeda(totalValor)}`,
    `Preventivas: ${preventivas} | Viagens: ${viagens}`,
    `Agendado: ${itens.filter((i) => i.status === "AGENDADO").length} | Em andamento: ${itens.filter((i) => i.status === "EM ANDAMENTO").length} | Finalizado: ${itens.filter((i) => i.status === "FINALIZADO").length}`,
  ]);

  const body = itens.map((i) => {
    const dataHora = i.horaRef
      ? `${formatarDataBr(i.dataRef)} ${i.horaRef.slice(0, 5)}`
      : formatarDataBr(i.dataRef);
    return [
      dataHora,
      i.nome,
      i.descricao || "—",
      i.onde,
      i.veiculoPlaca || "—",
      i.motoristaNome || "—",
      formatarKm(i.km),
      i.status,
      i.source === "preventiva" ? "Preventiva" : "Viagem",
      formatarMoeda(i.valor),
      textoAnexo(!!i.nota_fiscal_path),
      textoAnexo(!!i.comprovante_path),
    ];
  });

  autoTable(doc, {
    startY,
    head: [
      [
        "Data/Hora",
        "Serviço",
        "Descrição",
        "Local / Oficina",
        "Veículo",
        "Motorista",
        "KM",
        "Status",
        "Origem",
        "Valor",
        "NF",
        "Comp.",
      ],
    ],
    body: body.length ? body : [["—", "Nenhum registro no período", "", "", "", "", "", "", "", "", "", ""]],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [0, 120, 140], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    margin: { left: 14, right: 14 },
  });

  aplicarRodapes(doc);
  doc.save(`relatorio-manutencao_${de}_${ate}.pdf`);
}

export function gerarPdfAbastecimento(
  itens: AbastecimentoCard[],
  de: string,
  ate: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const totalValor = itens.reduce((s, i) => s + i.valor, 0);
  const litrosTotal = itens.reduce((s, i) => s + (i.litros ?? 0), 0);
  const manuais = itens.filter((i) => i.source === "manual").length;
  const viagens = itens.filter((i) => i.source === "viagem").length;

  const startY = cabecalhoRelatorio(doc, "Relatório de Abastecimentos", de, ate, [
    `Total de registros: ${itens.length}`,
    `Valor total: ${formatarMoeda(totalValor)}`,
    `Litros informados: ${litrosTotal > 0 ? litrosTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L" : "—"}`,
    `Manual: ${manuais} | Viagens: ${viagens}`,
  ]);

  const body = itens.map((i) => [
    formatarDataHoraBr(i.dataHora),
    formatarMoeda(i.valor),
    i.litros != null ? `${i.litros.toLocaleString("pt-BR")} L` : "—",
    formatarKm(i.km),
    i.postoNome || "—",
    i.veiculoLabel || "—",
    i.motoristaNome || "—",
    i.descricao || "—",
    i.source === "manual" ? "Manual" : "Viagem",
    textoAnexo(!!i.nota_fiscal_path),
    textoAnexo(!!i.comprovante_path),
  ]);

  autoTable(doc, {
    startY,
    head: [
      [
        "Data/Hora",
        "Valor",
        "Litros",
        "KM",
        "Posto",
        "Veículo",
        "Motorista",
        "Descrição",
        "Origem",
        "NF",
        "Comp.",
      ],
    ],
    body: body.length ? body : [["—", "Nenhum registro no período", "", "", "", "", "", "", "", "", ""]],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [0, 120, 140], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    margin: { left: 14, right: 14 },
  });

  aplicarRodapes(doc);
  doc.save(`relatorio-abastecimentos_${de}_${ate}.pdf`);
}
