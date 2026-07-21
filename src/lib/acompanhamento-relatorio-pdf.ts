import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AcompanhamentoRelatorioFiltros, AcompanhamentoViagemItem } from "@/lib/acompanhamento-data";
import {
  agruparViagensPorPlaca,
  nomesFornecedoresViagem,
} from "@/lib/acompanhamento-data";
import type { ParceiroSugestao } from "@/lib/parceiros";
import { formatarDataBr, formatarDataHoraBr, formatarMoeda } from "@/lib/frota-filters";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { VINCULO_OPCOES } from "@/lib/viagem-validation";
import { createClient } from "@/lib/supabase/client";
import { calcularFreteLiquido, ICMS_FRETE_PERCENT } from "@/types/fechamento";
import { extrairCidadeEstadoLabel } from "@/lib/viagem-parceiros-viagem";
import { normalizarDataPagamento } from "@/lib/viagem-pagamento-terceiro";

type DocComAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGEM_X = 10;
const MARGEM_INFERIOR = 16;

export const ACOMPANHAMENTO_RELATORIO_COLUNAS = [
  { key: "data_embarque", label: "Data do embarque" },
  { key: "numero_cte", label: "Número do CT-e" },
  { key: "placa", label: "Placa do veículo" },
  { key: "motorista", label: "Motorista" },
  { key: "origem", label: "Origem" },
  { key: "destino", label: "Destino" },
  { key: "cliente", label: "Cliente" },
  { key: "valor_frete", label: "Valor do frete" },
  { key: "frete_livre_icms", label: "Frete livre de encargos (ICMS)" },
  { key: "data_pagamento", label: "Data de pagamento" },
  { key: "peso", label: "Peso" },
  { key: "descarga", label: "Descarga" },
  { key: "diaria", label: "Diária" },
] as const;

export type AcompanhamentoRelatorioColunaKey =
  (typeof ACOMPANHAMENTO_RELATORIO_COLUNAS)[number]["key"];

export type AcompanhamentoRelatorioColunasSelecionadas = Record<
  AcompanhamentoRelatorioColunaKey,
  boolean
>;

export function colunasRelatorioPadrao(): AcompanhamentoRelatorioColunasSelecionadas {
  return Object.fromEntries(
    ACOMPANHAMENTO_RELATORIO_COLUNAS.map((c) => [c.key, true])
  ) as AcompanhamentoRelatorioColunasSelecionadas;
}

export function listarColunasAtivas(
  selecionadas: AcompanhamentoRelatorioColunasSelecionadas
) {
  return ACOMPANHAMENTO_RELATORIO_COLUNAS.filter((c) => selecionadas[c.key]);
}

type LinhaRelatorio = {
  data_embarque: string;
  numero_cte: string;
  placa: string;
  motorista: string;
  origem: string;
  destino: string;
  cliente: string;
  valor_frete: string;
  frete_livre_icms: string;
  data_pagamento: string;
  peso: string;
  descarga: string;
  diaria: string;
  peso_num: number;
  frete_num: number;
};

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

function extrairNomeParceiro(texto: string | null | undefined): string | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  const sep = t.search(/\s[—–-]\s/);
  if (sep >= 0) {
    const nome = t.slice(0, sep).trim();
    return nome || null;
  }
  return t;
}

function labelOrigem(v: AcompanhamentoViagemItem, fornecedores: ParceiroSugestao[]) {
  const textos = v.fornecedores.map((f) => f.local_fornecedor).filter(Boolean);
  if (!textos.length && v.local_saida?.trim()) textos.push(v.local_saida.trim());
  if (!textos.length) return "—";
  const cidades = textos
    .map((t) => extrairCidadeEstadoLabel(t))
    .filter((t): t is string => !!t);
  if (cidades.length) return [...new Set(cidades)].join(" · ");
  return nomesFornecedoresViagem(v, fornecedores) || "—";
}

function labelDestino(v: AcompanhamentoViagemItem) {
  const textos = v.entregas.map((e) => e.local_entrega).filter(Boolean);
  if (!textos.length) return "—";
  const cidades = textos
    .map((t) => extrairCidadeEstadoLabel(t))
    .filter((t): t is string => !!t);
  if (cidades.length) return [...new Set(cidades)].join(" · ");
  return textos.join(" · ");
}

function labelCliente(v: AcompanhamentoViagemItem) {
  const nomes = v.entregas
    .map((e) => extrairNomeParceiro(e.local_entrega))
    .filter((t): t is string => !!t);
  return nomes.length ? [...new Set(nomes)].join(" · ") : "—";
}

function formatarMoedaOuTraco(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v) || v <= 0) return "—";
  return formatarMoeda(v);
}

export async function enriquecerLinhasRelatorioAcompanhamento(
  viagens: AcompanhamentoViagemItem[],
  fornecedoresCadastro: ParceiroSugestao[]
): Promise<LinhaRelatorio[]> {
  if (!viagens.length) return [];

  const supabase = createClient();
  const ids = viagens.map((v) => v.id);

  const [{ data: pagamentos }, { data: fechamentos }, { data: recebimentos }, { data: recursosDescarga }] =
    await Promise.all([
      supabase
        .from("viagens")
        .select("id, data_pagamento, data_pagamento_terceiro")
        .in("id", ids),
      supabase
        .from("viagem_fechamentos")
        .select("viagem_id, icms_percent, frete_liquido, valor_frete")
        .in("viagem_id", ids),
      supabase
        .from("viagem_recebimentos")
        .select("viagem_id, valor_descargas_adicionais, valor_diarias")
        .in("viagem_id", ids),
      supabase
        .from("viagem_recursos")
        .select("viagem_id, valor")
        .in("viagem_id", ids)
        .eq("tipo", "descarga"),
    ]);

  const pagPorViagem = new Map(
    (pagamentos ?? []).map((p) => [
      p.id as string,
      normalizarDataPagamento(p.data_pagamento as string | null) ??
        normalizarDataPagamento(p.data_pagamento_terceiro as string | null),
    ])
  );
  const fechPorViagem = new Map(
    (fechamentos ?? []).map((f) => [f.viagem_id as string, f])
  );
  const recPorViagem = new Map(
    (recebimentos ?? []).map((r) => [r.viagem_id as string, r])
  );
  const descargaGastoPorViagem = new Map<string, number>();
  for (const r of recursosDescarga ?? []) {
    const viagemId = r.viagem_id as string;
    const valor = Number(r.valor) || 0;
    if (valor <= 0) continue;
    descargaGastoPorViagem.set(viagemId, (descargaGastoPorViagem.get(viagemId) ?? 0) + valor);
  }

  return viagens.map((v) => {
    const frete = v.valor_frete != null ? Number(v.valor_frete) : 0;
    const fech = fechPorViagem.get(v.id);
    const icmsPct =
      fech?.icms_percent != null && Number.isFinite(Number(fech.icms_percent))
        ? Number(fech.icms_percent)
        : ICMS_FRETE_PERCENT;
    const freteLivre =
      fech?.frete_liquido != null && Number(fech.frete_liquido) > 0
        ? Number(fech.frete_liquido)
        : frete > 0
          ? calcularFreteLiquido(frete, icmsPct)
          : 0;

    const rec = recPorViagem.get(v.id);
    const descargaRecebimento = Number(rec?.valor_descargas_adicionais) || 0;
    const descargaGasto = descargaGastoPorViagem.get(v.id) ?? 0;
    const descarga = descargaRecebimento + descargaGasto;
    const diaria = Number(rec?.valor_diarias) || 0;
    const dataPag = pagPorViagem.get(v.id) ?? null;

    return {
      data_embarque: v.saida_em ? formatarDataHoraBr(v.saida_em) : "Agendada",
      numero_cte: v.numero_cte?.trim() || "—",
      placa: v.placas || "—",
      motorista: v.motorista_nome || "—",
      origem: labelOrigem(v, fornecedoresCadastro),
      destino: labelDestino(v),
      cliente: labelCliente(v),
      valor_frete: formatarMoedaOuTraco(frete),
      frete_livre_icms: formatarMoedaOuTraco(freteLivre),
      data_pagamento: dataPag ? formatarDataBr(dataPag) : "—",
      peso: formatarPesoKg(v.peso_kg),
      descarga: formatarMoedaOuTraco(descarga),
      diaria: formatarMoedaOuTraco(diaria),
      peso_num: v.peso_kg != null && Number(v.peso_kg) > 0 ? Number(v.peso_kg) : 0,
      frete_num: frete > 0 ? frete : 0,
    };
  });
}

function celulasLinha(
  linha: LinhaRelatorio,
  colunas: { key: AcompanhamentoRelatorioColunaKey; label: string }[]
) {
  return colunas.map((c) => linha[c.key]);
}

function estiloTabela(qtdColunas: number) {
  const fontSize = qtdColunas >= 10 ? 5.5 : qtdColunas >= 7 ? 6.2 : 7;
  return {
    styles: {
      fontSize,
      cellPadding: qtdColunas >= 10 ? 0.9 : 1.2,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: [0, 100, 120] as [number, number, number],
      fontSize: fontSize + 0.5,
      fontStyle: "bold" as const,
      textColor: 255,
    },
    alternateRowStyles: { fillColor: [248, 251, 252] as [number, number, number] },
    margin: { left: MARGEM_X, right: MARGEM_X, bottom: MARGEM_INFERIOR },
  };
}

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

function desenharResumoPlaca(
  doc: DocComAutoTable,
  placa: string,
  y: number,
  linhas: LinhaRelatorio[]
) {
  const pesoTotal = linhas.reduce((s, l) => s + l.peso_num, 0);
  const faturamento = linhas.reduce((s, l) => s + l.frete_num, 0);
  y = garantirEspaco(doc, y, 14);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[`Resumo — ${placa}`, "", ""]],
    body: [
      [
        `Viagens: ${linhas.length}`,
        `Peso: ${formatarPesoKg(pesoTotal || null)}`,
        `Faturamento: ${formatarMoeda(faturamento)}`,
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

function desenharResumoGeral(doc: DocComAutoTable, y: number, linhas: LinhaRelatorio[]) {
  const pesoTotal = linhas.reduce((s, l) => s + l.peso_num, 0);
  const faturamento = linhas.reduce((s, l) => s + l.frete_num, 0);
  y = garantirEspaco(doc, y, 16);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Resumo geral", "", ""]],
    body: [
      [
        `Viagens: ${linhas.length}`,
        `Peso: ${formatarPesoKg(pesoTotal || null)}`,
        `Valor total do frete: ${formatarMoeda(faturamento)}`,
      ],
    ],
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      fontStyle: "bold",
      textColor: [20, 40, 50],
    },
    headStyles: {
      fillColor: [0, 100, 120],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fillColor: [232, 244, 248] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 55 },
      2: { cellWidth: 70 },
    },
    margin: { left: MARGEM_X, right: MARGEM_X, bottom: MARGEM_INFERIOR },
  });

  return finalY(doc, y) + 6;
}

function renderSecaoPlaca(
  doc: DocComAutoTable,
  placa: string,
  linhas: LinhaRelatorio[],
  colunas: { key: AcompanhamentoRelatorioColunaKey; label: string }[],
  startY: number
) {
  let y = garantirEspaco(doc, startY, 28);
  y = desenharTituloPlaca(doc, placa, linhas.length, y);

  autoTable(doc, {
    startY: y,
    head: [colunas.map((c) => c.label)],
    body: linhas.map((l) => celulasLinha(l, colunas)),
    ...estiloTabela(colunas.length),
  });

  y = finalY(doc, y) + 3;
  return desenharResumoPlaca(doc, placa, y, linhas);
}

function cabecalhoRelatorio(
  doc: jsPDF,
  filtros: AcompanhamentoRelatorioFiltros,
  fornecedores: ParceiroSugestao[],
  qtdViagens: number,
  modoTodasPlacas: boolean,
  qtdPlacas: number,
  valorTotalFrete: number
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
  const linhas = [
    `Período: ${formatarDataBr(filtros.de)} até ${formatarDataBr(filtros.ate)}`,
    `Status: ${labelFiltroStatus(filtros.status)} · Fornecedor: ${labelFiltroFornecedor(filtros.fornecedorId, fornecedores)} · Vínculo: ${labelFiltroVinculo(filtros.vinculo)}`,
    modoTodasPlacas
      ? `Placas (caminhão/cavalo): ${qtdPlacas} veículo(s) · ${qtdViagens} viagem(ns) no período`
      : `Placa: ${filtros.placa} · ${qtdViagens} viagem(ns)`,
    `Valor total do frete: ${formatarMoeda(valorTotalFrete)}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
  ];
  for (const linha of linhas) {
    doc.text(linha, MARGEM_X, y);
    y += 4;
  }
  return y + 4;
}

export async function gerarPdfAcompanhamentoRelatorio(
  viagens: AcompanhamentoViagemItem[],
  filtros: AcompanhamentoRelatorioFiltros,
  fornecedores: ParceiroSugestao[],
  colunasSelecionadas: AcompanhamentoRelatorioColunasSelecionadas = colunasRelatorioPadrao()
) {
  const colunas = listarColunasAtivas(colunasSelecionadas);
  if (!colunas.length) {
    throw new Error("Selecione ao menos um dado para exibir no relatório.");
  }

  const linhas = await enriquecerLinhasRelatorioAcompanhamento(viagens, fornecedores);
  const linhaPorId = new Map(viagens.map((v, i) => [v.id, linhas[i]!]));

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  }) as DocComAutoTable;
  const modoTodasPlacas = !filtros.placa;

  const grupos = modoTodasPlacas
    ? agruparViagensPorPlaca(viagens)
    : [{ placa: filtros.placa, viagens }];

  const valorTotalFrete = linhas.reduce((s, l) => s + l.frete_num, 0);

  let y = cabecalhoRelatorio(
    doc,
    filtros,
    fornecedores,
    viagens.length,
    modoTodasPlacas,
    grupos.length,
    valorTotalFrete
  );

  for (const grupo of grupos) {
    const linhasGrupo = grupo.viagens
      .map((v) => linhaPorId.get(v.id))
      .filter((l): l is LinhaRelatorio => !!l);
    y = renderSecaoPlaca(doc, grupo.placa, linhasGrupo, colunas, y);
  }

  desenharResumoGeral(doc, y, linhas);

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    rodape(doc, i, total);
  }

  const slug = `${filtros.de}_${filtros.ate}`.replace(/[^\d-]/g, "");
  const sufixo = filtros.placa
    ? `_${filtros.placa.replace(/[^a-zA-Z0-9]/g, "")}`
    : "_por-placa";
  doc.save(`relatorio-acompanhamento${sufixo}_${slug}.pdf`);
}
