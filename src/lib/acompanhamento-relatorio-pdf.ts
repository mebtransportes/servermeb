import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AcompanhamentoRelatorioFiltros, AcompanhamentoViagemItem } from "@/lib/acompanhamento-data";
import { nomesFornecedoresViagem } from "@/lib/acompanhamento-data";
import type { ParceiroSugestao } from "@/lib/parceiros";
import { formatarDataBr, formatarDataHoraBr, formatarMoeda } from "@/lib/frota-filters";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { labelVinculo, VINCULO_OPCOES } from "@/lib/viagem-validation";

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

function labelFiltroFornecedor(
  fornecedorId: string,
  fornecedores: ParceiroSugestao[]
) {
  if (!fornecedorId) return "Todos";
  return fornecedores.find((f) => f.id === fornecedorId)?.nome ?? "—";
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

export function gerarPdfAcompanhamentoRelatorio(
  viagens: AcompanhamentoViagemItem[],
  filtros: AcompanhamentoRelatorioFiltros,
  fornecedores: ParceiroSugestao[]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const parceirosFornecedor = fornecedores;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Acompanhamento", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  let y = 36;
  const linhasCabecalho = [
    `Período selecionado: ${formatarDataBr(filtros.de)} até ${formatarDataBr(filtros.ate)}`,
    `Status: ${labelFiltroStatus(filtros.status)}`,
    `Fornecedor: ${labelFiltroFornecedor(filtros.fornecedorId, fornecedores)}`,
    `Vínculo: ${labelFiltroVinculo(filtros.vinculo)}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    `Total de viagens: ${viagens.length}`,
  ];
  for (const linha of linhasCabecalho) {
    doc.text(linha, 14, y);
    y += 5;
  }

  const body = viagens.map((v) => {
    const statusLabel = VIAGEM_STATUS_LABEL[v.status] ?? v.status;
    const dataViagem = v.saida_em
      ? formatarDataHoraBr(v.saida_em)
      : "Agendada";
    return [
      nomesFornecedoresViagem(v, parceirosFornecedor),
      dataViagem,
      statusLabel,
      labelVinculo(v.motorista_vinculo),
      formatarDataHoraBr(v.created_at),
      v.numero_cte?.trim() || "—",
      v.placas,
      v.motorista_nome,
      formatarPesoKg(v.peso_kg),
      v.valor_frete != null && Number(v.valor_frete) > 0
        ? formatarMoeda(Number(v.valor_frete))
        : "—",
    ];
  });

  autoTable(doc, {
    startY: y + 4,
    head: [
      [
        "Fornecedor",
        "Data da viagem",
        "Status",
        "Vínculo",
        "Data cadastro",
        "CT-e",
        "Placas",
        "Motorista",
        "Peso carga",
        "Frete",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [0, 100, 120], fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 28 },
      4: { cellWidth: 28 },
      7: { cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    rodape(doc, i, total);
  }

  const slug = `${filtros.de}_${filtros.ate}`.replace(/[^\d-]/g, "");
  doc.save(`relatorio-acompanhamento_${slug}.pdf`);
}
