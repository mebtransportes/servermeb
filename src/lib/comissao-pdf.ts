import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ViagemFechamento } from "@/types/fechamento";
import {
  totalDespesasFechamento,
  calcularComissionamento,
  calcularConsumoKmLitro,
  formatConsumoKmLitro,
  getComissaoPercent,
  getIcmsPercent,
  agruparFechamentosComissao,
} from "@/types/fechamento";
import { formatarMoeda, formatarDataBr } from "@/lib/frota-filters";

function fmtMoeda(v: number) {
  return formatarMoeda(v);
}

function linhasFechamento(f: ViagemFechamento): [string, string][] {
  const icms = getIcmsPercent(f);
  const comissaoTipo = (f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL";
  const comissaoPercent = getComissaoPercent(f);
  const litrosTanque = Number(f.litros_tanque_inicial) || 0;
  const litrosViagem = Number(f.litros_abastecimento_viagem) || 0;
  const litrosTotal =
    litrosTanque + litrosViagem > 0
      ? litrosTanque + litrosViagem
      : f.abastecimento_litros;
  const consumo =
    f.consumo_km_litro ?? calcularConsumoKmLitro(f.km_total, litrosTotal);
  const despesas = totalDespesasFechamento(f);
  const { frete_liquido, total_comissao, comissao_final, valor_icms } =
    calcularComissionamento({
      valorFrete: Number(f.valor_frete) || 0,
      icmsPercent: icms,
      comissaoPercent,
      comissaoTipo,
      reembolso: Number(f.reembolso_valor) || 0,
      motoristaTerceiro: !!f.motorista_terceiro,
      seguroValor: f.seguro_valor,
      monitoramentoValor: f.monitoramento_valor,
    });

  const fmtLitros = (n: number) =>
    n > 0 ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L" : "—";

  const comissaoLabel =
    comissaoTipo === "LIQUIDO_TOTAL"
      ? "Comissão (frete líquido total)"
      : `Comissão (${comissaoPercent}% do líquido)`;

  return [
    ["Local do embarque", f.local_embarque],
    ["Veículo", f.veiculo_label],
    ["CTE", f.numero_cte ?? "—"],
    ["Destino", f.destino ?? "—"],
    ["KM total", f.km_total != null ? f.km_total.toLocaleString("pt-BR") : "—"],
    ["Litros no tanque (frota)", fmtLitros(litrosTanque)],
    ["Litros na viagem", fmtLitros(litrosViagem)],
    ["Total litros", litrosTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"],
    ["Consumo médio (km/L)", formatConsumoKmLitro(consumo)],
    ["Abastecimento (valor)", fmtMoeda(f.abastecimento_valor)],
    ["Arla", fmtMoeda(f.arla_valor)],
    ["Manutenção total", fmtMoeda(f.manutencao_total)],
    ["Pedágio / estacionamento", fmtMoeda(f.pedagio_valor)],
    ...(!f.motorista_terceiro && (f.seguro_valor ?? 0) > 0
      ? [["Seguro", fmtMoeda(f.seguro_valor ?? 0)] as [string, string]]
      : []),
    ...(!f.motorista_terceiro && (f.monitoramento_valor ?? 0) > 0
      ? [["Monitoramento", fmtMoeda(f.monitoramento_valor ?? 0)] as [string, string]]
      : []),
    ["Total gastos", fmtMoeda(despesas)],
    ["Reembolso ao motorista", fmtMoeda(f.reembolso_valor)],
    ...(f.motorista_terceiro
      ? [["Valor da carga", fmtMoeda(f.valor_carga ?? 0)] as [string, string]]
      : []),
    ["Frete bruto", fmtMoeda(f.valor_frete)],
    [`ICMS (${icms}%)`, fmtMoeda(valor_icms)],
    ...(f.motorista_terceiro
      ? [
          ["Seguro (0,09% da carga)", fmtMoeda(f.seguro_valor ?? 0)] as [string, string],
          ["Monitoramento", fmtMoeda(f.monitoramento_valor ?? 0)] as [string, string],
        ]
      : []),
    [
      f.motorista_terceiro
        ? "Frete líquido (bruto − ICMS − seguro − monitoramento)"
        : `Frete líquido (ICMS ${icms}%)`,
      fmtMoeda(frete_liquido),
    ],
    [comissaoLabel, fmtMoeda(total_comissao)],
    ["Comissão final (comissão + reembolso)", fmtMoeda(comissao_final)],
  ];
}

export function gerarPdfComissaoMotorista(opts: {
  motoristaNome: string;
  periodoLabel: string;
  fechamentos: ViagemFechamento[];
}) {
  const { motoristaNome, periodoLabel, fechamentos } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 18;

  const resumo = agruparFechamentosComissao(fechamentos);
  const geradoEm = new Date().toLocaleString("pt-BR");

  function novaPaginaSePreciso(altura: number) {
    if (y + altura > pageH - 20) {
      doc.addPage();
      y = 18;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 120);
  doc.text("MEB Gestão de Transporte", margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório de Comissão", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Motorista: ${motoristaNome}`, margin, y);
  y += 5;
  doc.text(`Período: ${periodoLabel}`, margin, y);
  y += 5;
  doc.text(`Gerado em: ${geradoEm}`, margin, y);
  y += 5;
  doc.text(`Viagens selecionadas: ${resumo.viagens}`, margin, y);
  y += 5;
  doc.text(`KM total: ${resumo.km_total.toLocaleString("pt-BR")}`, margin, y);
  y += 5;
  doc.text(`Frete bruto: ${fmtMoeda(resumo.valor_frete)}`, margin, y);
  y += 5;
  if (resumo.motorista_terceiro) {
    doc.text(`ICMS total: ${fmtMoeda(resumo.valor_icms)}`, margin, y);
    y += 5;
    doc.text(`Seguro total: ${fmtMoeda(resumo.seguro_valor)}`, margin, y);
    y += 5;
    doc.text(`Monitoramento total: ${fmtMoeda(resumo.monitoramento_valor)}`, margin, y);
    y += 5;
  }
  doc.text(`Frete líquido: ${fmtMoeda(resumo.frete_liquido)}`, margin, y);
  y += 5;
  doc.text(`Total de despesas: ${fmtMoeda(resumo.despesas)}`, margin, y);
  y += 5;
  doc.text(`Reembolso: ${fmtMoeda(resumo.reembolso_valor)}`, margin, y);
  y += 5;
  doc.text(`Total de comissão: ${fmtMoeda(resumo.comissao_final)}`, margin, y);
  y += 10;

  for (let i = 0; i < fechamentos.length; i++) {
    const f = fechamentos[i];
    const titulo = `Viagem ${i + 1} — ${formatarDataBr(f.data_embarque.split("T")[0])}`;
    novaPaginaSePreciso(50);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 120, 140);
    doc.text(titulo, margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Campo", "Valor"]],
      body: linhasFechamento(f),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 120, 140], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: "bold", textColor: [80, 80, 80] },
        1: { cellWidth: "auto" },
      },
      margin: { left: margin, right: margin },
      theme: "grid",
    });

    const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
    y = (docWithTable.lastAutoTable?.finalY ?? y) + 8;
  }

  novaPaginaSePreciso(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(`Total de comissão (viagens selecionadas): ${fmtMoeda(resumo.comissao_final)}`, margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(motoristaNome, margin, y);
  doc.line(margin, y + 2, 120, y + 2);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Assinatura do motorista", margin, y + 7);

  doc.save(
    `comissao-${motoristaNome.replace(/\s+/g, "_")}_${periodoLabel.replace(/\s+/g, "_")}.pdf`
  );
}
