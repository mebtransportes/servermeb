import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_SRC } from "@/components/brand/logo";
import { fetchOutrosDespesasPorViagens } from "@/lib/fechamento-outros-despesas";
import { fetchAdiantamentosPorViagens } from "@/lib/fechamento-adiantamentos";
import { desenharRodapeAssinaturasRecibo, RODAPE_ASSINATURA_ALTURA } from "@/lib/pdf-recibo-rodape";
import type { ViagemFechamento } from "@/types/fechamento";
import {
  agruparFechamentosComissao,
  comissionamentoFechamento,
  COMISSAO_MOTORISTA_PERCENT,
} from "@/types/fechamento";
import { formatarDataBr, formatarMoeda } from "@/lib/frota-filters";

const COR_PRIMARIA: [number, number, number] = [0, 120, 140];
const COR_FUNDO: [number, number, number] = [240, 249, 250];
const MARGIN = 14;
const PAGE_W = 210;

async function carregarImagemBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
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

function periodoDasViagens(fechamentos: ViagemFechamento[]): string {
  if (!fechamentos.length) return "—";
  const datas = fechamentos
    .map((f) => f.data_embarque.split("T")[0])
    .sort();
  const de = datas[0];
  const ate = datas[datas.length - 1];
  if (de === ate) return formatarDataBr(de);
  return `${formatarDataBr(de)} a ${formatarDataBr(ate)}`;
}

function encurtar(texto: string, max = 36): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function desenharCaixa(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  titulo: string,
  linhas: string[]
) {
  doc.setDrawColor(210, 218, 226);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(titulo.toUpperCase(), x + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  let ly = y + 12;
  for (const linha of linhas) {
    doc.text(linha, x + 4, ly);
    ly += 5;
  }
}

export async function gerarPdfComissaoMotorista(opts: {
  motoristaNome: string;
  motoristaDocumento?: string | null;
  periodoLabel?: string;
  fechamentos: ViagemFechamento[];
}) {
  const { motoristaNome, motoristaDocumento, fechamentos } = opts;
  const ehTerceiro = fechamentos.every((f) => f.motorista_terceiro);
  const resumo = agruparFechamentosComissao(fechamentos);
  const comissaoBrutaFrota = ehTerceiro ? 0 : resumo.comissao_bruta;
  const valorPagar = resumo.comissao_final;
  const periodoViagens = opts.periodoLabel ?? periodoDasViagens(fechamentos);
  const geradoEm = new Date().toLocaleString("pt-BR");
  const reciboNum = `RC-${Date.now().toString(36).toUpperCase()}`;

  const arlaTotal = fechamentos.reduce((s, f) => s + (Number(f.arla_valor) || 0), 0);
  const manutTotal = fechamentos.reduce(
    (s, f) => s + (Number(f.manutencao_total) || 0),
    0
  );
  const pedagioTotal = fechamentos.reduce(
    (s, f) =>
      s +
      (Number(f.pedagio_valor) || 0) +
      (Number(f.estacionamento_valor) || 0) +
      (Number(f.descarga_valor) || 0),
    0
  );
  const outrosTotal = fechamentos.reduce(
    (s, f) => s + (Number(f.outros_valor) || 0),
    0
  );

  const outrosMap = await fetchOutrosDespesasPorViagens(
    fechamentos.map((f) => f.viagem_id)
  );
  const adiantamentosMap = await fetchAdiantamentosPorViagens(
    fechamentos.map((f) => f.viagem_id)
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const contentW = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const logo = await carregarImagemBase64(LOGO_SRC);

  doc.setFillColor(...COR_FUNDO);
  doc.rect(0, 0, PAGE_W, 42, "F");
  doc.setDrawColor(...COR_PRIMARIA);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 42, PAGE_W - MARGIN, 42);

  if (logo) {
    doc.addImage(logo, "PNG", MARGIN, y, 38, 14);
  }

  const tituloX = PAGE_W - MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COR_PRIMARIA);
  doc.text(
    ehTerceiro ? "RECIBO DE REPASSE — TERCEIRO" : "RECIBO DE COMISSÃO — FROTA",
    tituloX,
    y + 5,
    { align: "right" }
  );
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Prestação de serviço de transporte rodoviário de cargas", tituloX, y + 11, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Nº ${reciboNum}`, tituloX, y + 17, { align: "right" });
  doc.text(`Emissão: ${geradoEm}`, tituloX, y + 22, { align: "right" });

  y = 48;

  const boxW = (contentW - 4) / 2;
  const beneficiarioLinhas = [
    motoristaNome,
    motoristaDocumento ? `CPF/CNPJ: ${motoristaDocumento}` : "CPF/CNPJ: não informado",
    ehTerceiro ? "Transportador terceiro" : "Motorista — frota própria",
  ];
  desenharCaixa(doc, MARGIN, y, boxW, 24, "Pagador", [
    "MEB Transportes",
    "Gestão de Transporte Rodoviário",
  ]);
  desenharCaixa(doc, MARGIN + boxW + 4, y, boxW, 24, "Beneficiário", beneficiarioLinhas);

  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Período de referência: ${periodoViagens}`, MARGIN, y);
  doc.text(
    `${resumo.viagens} viagem(ns) · ${resumo.km_rodado.toLocaleString("pt-BR")} km rodados`,
    PAGE_W - MARGIN,
    y,
    { align: "right" }
  );
  y += 8;

  const linhasPagamento: (string | { content: string; styles?: object })[][] = [
    ["Frete bruto total", formatarMoeda(resumo.valor_frete)],
    ["(-) ICMS", formatarMoeda(resumo.valor_icms)],
    ["Frete Livre de Encargos", formatarMoeda(resumo.frete_liquido)],
  ];

  if (ehTerceiro) {
    linhasPagamento.push(["(-) Total de despesas", formatarMoeda(resumo.despesas)]);
  } else {
    linhasPagamento.push(
      ["(-) Total de despesas", formatarMoeda(resumo.despesas)],
      [
        `Comissão bruta (${COMISSAO_MOTORISTA_PERCENT}%)`,
        formatarMoeda(comissaoBrutaFrota),
      ]
    );
    if (resumo.reembolso_valor > 0) {
      linhasPagamento.push(["(+) Reembolsos", formatarMoeda(resumo.reembolso_valor)]);
    }
    if (resumo.adiantamento_valor > 0) {
      linhasPagamento.push(["(-) Adiantamentos", formatarMoeda(resumo.adiantamento_valor)]);
    }
  }

  linhasPagamento.push([
    {
      content: ehTerceiro ? "VALOR LÍQUIDO A REPASSAR" : "COMISSÃO LÍQUIDA A PAGAR",
      styles: { fontStyle: "bold", fillColor: COR_PRIMARIA, textColor: 255 },
    },
    {
      content: formatarMoeda(valorPagar),
      styles: { fontStyle: "bold", fillColor: COR_PRIMARIA, textColor: 255, halign: "right" },
    },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Valor (R$)"]],
    body: linhasPagamento,
    styles: { fontSize: 9, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 118, overflow: "linebreak" },
      1: { halign: "right", cellWidth: "auto", overflow: "linebreak" },
    },
    margin: { left: MARGIN, right: MARGIN },
    theme: "striped",
  });

  const docTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docTable.lastAutoTable?.finalY ?? y) + 6;

  /** Reserva espaço no fim da última página para resumo + assinaturas. */
  const margemRodape = RODAPE_ASSINATURA_ALTURA + MARGIN + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COR_PRIMARIA);
  doc.text("Viagens incluídas neste recibo", MARGIN, y);
  y += 3;

  const qtdViagens = fechamentos.length;
  const fonteViagens = qtdViagens > 12 ? 6.5 : qtdViagens > 8 ? 7 : 7.5;
  const padViagens = qtdViagens > 12 ? 1.2 : 1.6;
  const colValor = ehTerceiro ? "Valor líquido" : "Comissão líq.";

  autoTable(doc, {
    startY: y + 2,
    head: [["Data", "CT-e", "Trajeto", "Veículo", colValor]],
    body: fechamentos
      .slice()
      .sort(
        (a, b) =>
          new Date(a.data_embarque).getTime() - new Date(b.data_embarque).getTime()
      )
      .map((f) => [
        formatarDataBr(f.data_embarque.split("T")[0]),
        f.numero_cte ?? "—",
        encurtar(`${f.local_embarque} → ${f.destino ?? "—"}`, qtdViagens > 10 ? 34 : 42),
        encurtar(f.veiculo_label, qtdViagens > 10 ? 18 : 22),
        formatarMoeda(comissionamentoFechamento(f).comissao_final),
      ]),
    styles: { fontSize: fonteViagens, cellPadding: padViagens },
    headStyles: { fillColor: [51, 65, 85], fontSize: fonteViagens },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 32 },
      4: { halign: "right", cellWidth: 24 },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: margemRodape },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = (docTable.lastAutoTable?.finalY ?? y) + 4;

  const outrosLinhas: string[][] = [];
  for (const f of fechamentos) {
    const itens = outrosMap.get(f.viagem_id) ?? [];
    for (const d of itens) {
      outrosLinhas.push([
        f.numero_cte ?? formatarDataBr(f.data_embarque.split("T")[0]),
        d.nome,
        formatarMoeda(d.valor),
        d.anexos.length ? d.anexos.map((a) => a.label).join(" · ") : "—",
      ]);
    }
  }

  if (outrosLinhas.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COR_PRIMARIA);
    doc.text("Outras despesas — detalhamento", MARGIN, y + 4);
    y += 6;

    autoTable(doc, {
      startY: y + 2,
      head: [["Viagem (CT-e)", "Despesa", "Valor", "Anexos"]],
      body: outrosLinhas,
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [51, 65, 85], fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: "auto" },
        2: { halign: "right", cellWidth: 24 },
        3: { cellWidth: 52 },
      },
      margin: { left: MARGIN, right: MARGIN, bottom: margemRodape },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (docTable.lastAutoTable?.finalY ?? y) + 4;
  }

  if (!ehTerceiro) {
    const adiantamentoLinhas: string[][] = [];
    for (const f of fechamentos) {
      const itens = adiantamentosMap.get(f.viagem_id) ?? [];
      for (const a of itens) {
        adiantamentoLinhas.push([
          f.numero_cte ?? formatarDataBr(f.data_embarque.split("T")[0]),
          a.descricao?.trim() || "Adiantamento",
          formatarDataBr(a.realizado_em.split("T")[0]),
          formatarMoeda(a.valor),
        ]);
      }
    }

    if (adiantamentoLinhas.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COR_PRIMARIA);
      doc.text("Adiantamentos — detalhamento", MARGIN, y + 4);
      y += 6;

      autoTable(doc, {
        startY: y + 2,
        head: [["Viagem (CT-e)", "Descrição", "Data", "Valor"]],
        body: adiantamentoLinhas,
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [194, 65, 12], fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 22 },
          3: { halign: "right", cellWidth: 24 },
        },
        margin: { left: MARGIN, right: MARGIN, bottom: margemRodape },
        alternateRowStyles: { fillColor: [255, 247, 237] },
      });

      y = (docTable.lastAutoTable?.finalY ?? y) + 4;
    }
  }

  const pageH = doc.internal.pageSize.getHeight();
  const rodapeY = pageH - MARGIN - RODAPE_ASSINATURA_ALTURA;
  const resumoY = Math.min(y, rodapeY - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const infoDespesas = [
    `Abastecimento ${formatarMoeda(resumo.abastecimento_valor)}`,
    `Arla ${formatarMoeda(arlaTotal)}`,
    `Manutenção ${formatarMoeda(manutTotal)}`,
    `Pedágio/Estacion. ${formatarMoeda(pedagioTotal)}`,
    `Outras ${formatarMoeda(outrosTotal)}`,
    `Total ${formatarMoeda(resumo.despesas)}`,
  ].join(" · ");
  doc.text(`Resumo de despesas (informativo): ${infoDespesas}`, MARGIN, resumoY, {
    maxWidth: contentW,
  });

  desenharRodapeAssinaturasRecibo(doc, {
    y: resumoY + 5,
    beneficiarioNome: motoristaNome,
    ehTerceiro,
  });

  const slug = motoristaNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  doc.save(
    `recibo-${ehTerceiro ? "terceiro" : "comissao"}_${slug || "motorista"}.pdf`
  );
}
