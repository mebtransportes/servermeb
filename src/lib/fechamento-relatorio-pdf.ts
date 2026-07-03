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
  paramsComissionamentoFechamento,
  totalDespesasFechamento,
  abastecimentoDescontoTotal,
  abastecimentoValorBruto,
  abastecimentoValorLiquido,
} from "@/types/fechamento";
import { formatarDataBr, formatarMoeda } from "@/lib/frota-filters";
import { createClient } from "@/lib/supabase/client";
import { desenharRodapeAssinaturasRecibo, RODAPE_ASSINATURA_ALTURA } from "@/lib/pdf-recibo-rodape";

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
  const contentW = PAGE_W - MARGIN * 2;
  const colW = contentW / cols;
  const rotuloLineH = 3.2;
  const valorLineH = 3.6;
  const gapRotuloValor = 1.5;
  const rowGap = 3;
  const rows = Math.ceil(pares.length / cols);
  let currentY = y;

  for (let row = 0; row < rows; row++) {
    const cells: {
      x: number;
      rotuloLines: string[];
      valorLines: string[];
      cellH: number;
    }[] = [];
    let rowHeight = 0;

    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      if (idx >= pares.length) break;

      const p = pares[idx];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const rotuloLines = doc.splitTextToSize(p.rotulo, colW - 2);
      doc.setFont("helvetica", "normal");
      const valorLines = doc.splitTextToSize(p.valor, colW - 2);
      const cellH =
        rotuloLines.length * rotuloLineH +
        gapRotuloValor +
        valorLines.length * valorLineH;

      cells.push({ x: MARGIN + col * colW, rotuloLines, valorLines, cellH });
      rowHeight = Math.max(rowHeight, cellH);
    }

    for (const cell of cells) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(cell.rotuloLines, cell.x, currentY);

      const valorY = currentY + cell.rotuloLines.length * rotuloLineH + gapRotuloValor;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(cell.valorLines, cell.x, valorY);
    }

    currentY += rowHeight + rowGap;
  }

  return currentY + 2;
}

function textoProgramacaoPagamento(dataPagamento: string | null | undefined): string | null {
  if (!dataPagamento?.trim()) return null;
  return formatarDataBr(dataPagamento.split("T")[0]);
}

async function resolverDataPagamentoTerceiro(f: ViagemFechamento): Promise<string | null> {
  if (!f.motorista_terceiro) return null;
  if (f.data_pagamento?.trim()) return f.data_pagamento;

  const supabase = createClient();
  const { data } = await supabase
    .from("viagens")
    .select("data_pagamento_terceiro")
    .eq("id", f.viagem_id)
    .maybeSingle();

  return (data?.data_pagamento_terceiro as string | null) ?? null;
}

export async function gerarPdfFechamentoViagem(f: ViagemFechamento) {
  const icms = getIcmsPercent(f);
  const despesas = totalDespesasFechamento(f);
  const { totalDespesasCalc, totalDespesasMotoristaCalc } = paramsComissionamentoFechamento(f);
  const despesasMotorista = totalDespesasMotoristaCalc;
  const calc = calcularComissionamento({
    valorFrete: Number(f.valor_frete) || 0,
    icmsPercent: icms,
    comissaoPercent: getComissaoPercent(f),
    comissaoTipo: (f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL",
    reembolso: Number(f.reembolso_valor) || 0,
    adiantamento: Number(f.adiantamento_valor) || 0,
    motoristaTerceiro: !!f.motorista_terceiro,
    totalDespesas: totalDespesasCalc,
    totalDespesasMotorista: totalDespesasMotoristaCalc,
  });

  const outrosMap = await fetchOutrosDespesasPorViagens([f.viagem_id]);
  const outros = outrosMap.get(f.viagem_id) ?? [];
  const adiantMap: Map<string, FechamentoAdiantamento[]> = f.motorista_terceiro
    ? new Map()
    : await fetchAdiantamentosPorViagens([f.viagem_id]);
  const adiantamentos = adiantMap.get(f.viagem_id) ?? [];
  const dataPagamentoTerceiro = await resolverDataPagamentoTerceiro(f);

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
  let headerExtra = 0;
  if (f.motorista_terceiro) {
    const progPag = textoProgramacaoPagamento(dataPagamentoTerceiro);
    if (progPag) {
      doc.text(`Programação de pagamento: ${progPag}`, PAGE_W - MARGIN, y + 15, {
        align: "right",
      });
      headerExtra = 5;
    }
  }
  y += 18 + headerExtra;

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

    const categorias = despesasCategoriasTerceiro(f).filter((c) => c.rotulo !== "Abastecimento");
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

    y = linhaCampos(
      doc,
      y,
      [
        {
          rotulo: "Total abastecimento (bruto)",
          valor: formatarMoeda(abastecimentoValorBruto(f)),
        },
        {
          rotulo: "Desconto em abastecimentos",
          valor: formatarMoeda(abastecimentoDescontoTotal(f)),
        },
        {
          rotulo: "Abastecimento líquido",
          valor: formatarMoeda(abastecimentoValorLiquido(f)),
        },
      ],
      3
    );

    y = secao(doc, y, "Cálculo geral");
    y = linhaCampos(
      doc,
      y,
      [
        { rotulo: "Frete bruto", valor: formatarMoeda(f.valor_frete) },
        { rotulo: "Frete Livre de Encargos", valor: formatarMoeda(calc.frete_liquido) },
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
        { rotulo: "Total abastecimento (bruto)", valor: formatarMoeda(abastecimentoValorBruto(f)) },
        {
          rotulo: "Desconto em abastecimentos",
          valor: formatarMoeda(abastecimentoDescontoTotal(f)),
        },
        {
          rotulo: "Abastecimento líquido",
          valor: formatarMoeda(abastecimentoValorLiquido(f)),
        },
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
        { rotulo: "Descarga", valor: formatarMoeda(f.descarga_valor ?? 0) },
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
        { rotulo: "Frete Livre de Encargos", valor: formatarMoeda(calc.frete_liquido) },
        { rotulo: "Valor do ICMS", valor: formatarMoeda(calc.valor_icms) },
        { rotulo: "Total de despesas", valor: formatarMoeda(despesas) },
        {
          rotulo: "Despesas do motorista (sem combustível e manut.)",
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
  const blocoFinalH = 14 + 4 + RODAPE_ASSINATURA_ALTURA;
  const blocoFinalY = pageH - MARGIN - blocoFinalH;

  if (y + 4 > blocoFinalY) {
    doc.addPage();
    y = MARGIN;
  }

  const boxY = Math.max(y + 4, blocoFinalY);
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
    y: boxY + 14,
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
