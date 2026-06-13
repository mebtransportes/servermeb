import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_SRC } from "@/components/brand/logo";
import { fetchOutrosDespesasPorViagens } from "@/lib/fechamento-outros-despesas";
import { fetchAdiantamentosPorViagens, type FechamentoAdiantamento } from "@/lib/fechamento-adiantamentos";
import {
  extrairPlacaVeiculo,
  formatKm,
  formatLitros,
  formatPeriodoViagem,
} from "@/lib/fechamento-format";
import type { ViagemFechamento } from "@/types/fechamento";
import {
  calcularComissionamento,
  formatConsumoKmLitro,
  despesasCategoriasTerceiro,
  getComissaoPercent,
  getIcmsPercent,
  totalDespesasFechamento,
  totalDespesasMotoristaFrota,
} from "@/types/fechamento";
import { formatarMoeda } from "@/lib/frota-filters";
import { desenharRodapeAssinaturasRecibo } from "@/lib/pdf-recibo-rodape";

const COR: [number, number, number] = [0, 120, 140];
const MARGIN = 12;
const PAGE_W = 210;

async function carregarLogo(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_SRC);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function secao(doc: jsPDF, y: number, titulo: string): number {
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(titulo.toUpperCase(), MARGIN + 2, y + 4.2);
  return y + 8;
}

function linhaCampos(
  doc: jsPDF,
  y: number,
  pares: { rotulo: string; valor: string }[],
  cols: number
): number {
  const w = (PAGE_W - MARGIN * 2) / cols;
  doc.setFontSize(7);
  pares.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * w;
    const ly = y + row * 11;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(p.rotulo, x, ly);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(p.valor, x, ly + 4, { maxWidth: w - 2 });
  });
  const rows = Math.ceil(pares.length / cols);
  return y + rows * 11 + 2;
}

export async function gerarPdfFechamentoViagem(f: ViagemFechamento) {
  const icms = getIcmsPercent(f);
  const despesas = totalDespesasFechamento(f);
  const despesasMotorista = f.motorista_terceiro
    ? despesas
    : totalDespesasMotoristaFrota(f);
  const calc = calcularComissionamento({
    valorFrete: Number(f.valor_frete) || 0,
    icmsPercent: icms,
    comissaoPercent: getComissaoPercent(f),
    comissaoTipo: (f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL",
    reembolso: Number(f.reembolso_valor) || 0,
    adiantamento: Number(f.adiantamento_valor) || 0,
    motoristaTerceiro: !!f.motorista_terceiro,
    totalDespesas: despesas,
    totalDespesasMotorista: despesasMotorista,
  });

  const outrosMap = await fetchOutrosDespesasPorViagens([f.viagem_id]);
  const outros = outrosMap.get(f.viagem_id) ?? [];
  const adiantMap: Map<string, FechamentoAdiantamento[]> = f.motorista_terceiro
    ? new Map()
    : await fetchAdiantamentosPorViagens([f.viagem_id]);
  const adiantamentos = adiantMap.get(f.viagem_id) ?? [];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await carregarLogo();
  let y = MARGIN;

  if (logo) doc.addImage(logo, "PNG", MARGIN, y, 36, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COR);
  const titulo = f.motorista_terceiro
    ? "RECIBO DE FECHAMENTO — TERCEIRO"
    : "RECIBO DE FECHAMENTO — FROTA";
  doc.text(titulo, PAGE_W - MARGIN, y + 5, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, PAGE_W - MARGIN, y + 10, {
    align: "right",
  });
  y += 18;

  y = secao(doc, y, "Identificação");
  y = linhaCampos(
    doc,
    y,
    [
      { rotulo: "Motorista", valor: f.motorista_nome },
      { rotulo: "Placa", valor: extrairPlacaVeiculo(f.veiculo_label) },
      { rotulo: "Período", valor: formatPeriodoViagem(f.data_embarque, f.chegada_em) },
      { rotulo: "Saída", valor: f.local_embarque },
      { rotulo: "Entrega", valor: f.destino ?? "—" },
      { rotulo: "CT-e", valor: f.numero_cte ?? "—" },
    ],
    3
  );

  if (f.motorista_terceiro) {
    y = secao(doc, y, "Controle de gastos");
    y = linhaCampos(
      doc,
      y,
      [
        { rotulo: "Seguro (0,09% da carga)", valor: formatarMoeda(f.seguro_valor ?? 0) },
        { rotulo: "Monitoramento", valor: formatarMoeda(f.monitoramento_valor ?? 0) },
        { rotulo: "Total de despesas", valor: formatarMoeda(despesas) },
      ],
      3
    );

    if (outros.length) {
      autoTable(doc, {
        startY: y,
        head: [["Outras despesas", "Valor (R$)"]],
        body: outros.map((o) => [o.nome, formatarMoeda(o.valor)]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: COR, fontSize: 7.5 },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 4;
    }

    const categorias = despesasCategoriasTerceiro(f);
    if (categorias.length) {
      autoTable(doc, {
        startY: y,
        head: [["Demais gastos", "Valor (R$)"]],
        body: categorias.map((c) => [c.rotulo, formatarMoeda(c.valor)]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [51, 65, 85], fontSize: 7.5 },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 4;
    }

    y = secao(doc, y, "Cálculo geral");
    y = linhaCampos(
      doc,
      y,
      [
        { rotulo: "Frete bruto", valor: formatarMoeda(f.valor_frete) },
        { rotulo: `Frete líquido (− ${icms}% ICMS)`, valor: formatarMoeda(calc.frete_liquido) },
        { rotulo: "Valor do ICMS", valor: formatarMoeda(calc.valor_icms) },
        { rotulo: "Total de despesas", valor: formatarMoeda(despesas) },
        {
          rotulo: "Valor líquido para repasse ao terceiro",
          valor: formatarMoeda(calc.comissao_final),
        },
      ],
      3
    );
  } else {
    y = secao(doc, y, "Controle de gastos");
    y = linhaCampos(
      doc,
      y,
      [
        { rotulo: "KM inicial da viagem", valor: formatKm(f.km_odometro_inicial) },
        {
          rotulo: "KM final após abastecimento",
          valor: formatKm(f.km_final_abastecimento ?? f.km_odometro_final),
        },
        { rotulo: "Total KM rodado", valor: formatKm(f.km_rodado ?? f.km_total) },
        { rotulo: "Total abastecimento", valor: formatarMoeda(f.abastecimento_valor) },
        { rotulo: "Total litros abastecidos", valor: formatLitros(f.litros_abastecimento_viagem) },
        {
          rotulo: "Consumo (km/L)",
          valor: formatConsumoKmLitro(
            f.consumo_km_litro ??
              (f.km_rodado && f.litros_abastecimento_viagem
                ? Number(f.km_rodado) / Number(f.litros_abastecimento_viagem)
                : null)
          ),
        },
        { rotulo: "Total Arla", valor: formatarMoeda(f.arla_valor) },
        { rotulo: "Manutenção", valor: formatarMoeda(f.manutencao_total) },
        { rotulo: "Pedágio", valor: formatarMoeda(f.pedagio_valor) },
        { rotulo: "Estacionamento", valor: formatarMoeda(f.estacionamento_valor ?? 0) },
      ],
      3
    );

    const tabelas: string[][] = [];
    for (const o of outros) tabelas.push([o.nome, formatarMoeda(o.valor)]);
    if (tabelas.length) {
      autoTable(doc, {
        startY: y,
        head: [["Outras despesas", "Valor (R$)"]],
        body: tabelas,
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [51, 65, 85], fontSize: 7.5 },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 4;
    }

    y = secao(doc, y, "Motorista");
    y = linhaCampos(
      doc,
      y,
      [
        { rotulo: "Adiantamentos", valor: formatarMoeda(f.adiantamento_valor ?? 0) },
        { rotulo: "Reembolsos", valor: formatarMoeda(f.reembolso_valor) },
      ],
      2
    );

    if (adiantamentos.length) {
      autoTable(doc, {
        startY: y,
        head: [["Adiantamento", "Valor (R$)"]],
        body: adiantamentos.map((a) => [
          a.descricao?.trim() || "Adiantamento",
          formatarMoeda(a.valor),
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [194, 65, 12], fontSize: 7.5 },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 4;
    }

    y = secao(doc, y, "Cálculo geral");
    const comPct = getComissaoPercent(f);
    y = linhaCampos(
      doc,
      y,
      [
        { rotulo: "Frete bruto", valor: formatarMoeda(f.valor_frete) },
        { rotulo: `Frete líquido (− ${icms}% ICMS)`, valor: formatarMoeda(calc.frete_liquido) },
        { rotulo: "Valor do ICMS", valor: formatarMoeda(calc.valor_icms) },
        { rotulo: "Total de despesas", valor: formatarMoeda(despesas) },
        {
          rotulo: "Despesas do motorista (sem abast. e manut.)",
          valor: formatarMoeda(despesasMotorista),
        },
        {
          rotulo: "Frete líquido retirando os gastos totais",
          valor: formatarMoeda(calc.frete_menos_gastos_totais ?? calc.frete_menos_gastos ?? 0),
        },
        {
          rotulo: "Frete líquido retirando os gastos do motorista",
          valor: formatarMoeda(calc.frete_menos_gastos_motorista ?? 0),
        },
        {
          rotulo: `Comissão bruta (${comPct}%)`,
          valor: formatarMoeda(calc.comissao_bruta ?? calc.total_comissao),
        },
        {
          rotulo: "Comissão líquida para recebimento",
          valor: formatarMoeda(calc.comissao_final),
        },
      ],
      3
    );
  }

  const valorFinal = calc.comissao_final;
  const pageH = doc.internal.pageSize.getHeight();
  let boxY = y + 6;
  if (boxY + 14 + 40 > pageH - MARGIN) {
    doc.addPage();
    boxY = MARGIN + 4;
  }
  doc.setFillColor(...COR);
  doc.roundedRect(MARGIN, boxY, PAGE_W - MARGIN * 2, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const labelFinal = f.motorista_terceiro
    ? "VALOR LÍQUIDO PARA REPASSE AO TERCEIRO"
    : "COMISSÃO LÍQUIDA PARA RECEBIMENTO";
  doc.text(labelFinal, MARGIN + 4, boxY + 6);
  doc.setFontSize(12);
  doc.text(formatarMoeda(valorFinal), PAGE_W - MARGIN - 4, boxY + 10, { align: "right" });

  desenharRodapeAssinaturasRecibo(doc, {
    y: boxY + 18,
    beneficiarioNome: f.motorista_nome,
    ehTerceiro: !!f.motorista_terceiro,
  });

  const slug = (f.numero_cte ?? f.motorista_nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .slice(0, 40);
  doc.save(
    `fechamento-${f.motorista_terceiro ? "terceiro" : "frota"}_${slug || "viagem"}.pdf`
  );
}

export async function gerarPdfFechamentosLote(opts: {
  fechamentos: ViagemFechamento[];
  motoristaNome: string;
  motoristaDocumento?: string | null;
  periodoLabel?: string;
}) {
  if (!opts.fechamentos.length) return;
  if (opts.fechamentos.length === 1) {
    await gerarPdfFechamentoViagem(opts.fechamentos[0]);
    return;
  }
  const { gerarPdfComissaoMotorista } = await import("@/lib/comissao-pdf");
  await gerarPdfComissaoMotorista({
    motoristaNome: opts.motoristaNome,
    motoristaDocumento: opts.motoristaDocumento,
    periodoLabel: opts.periodoLabel,
    fechamentos: opts.fechamentos,
  });
}
