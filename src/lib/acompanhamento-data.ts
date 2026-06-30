import { createClient } from "@/lib/supabase/client";
import { normalizarPlaca } from "@/lib/cadastro-busca";
import { dataNoIntervalo } from "@/lib/frota-filters";
import { formatarDuracaoViagem } from "@/lib/viagem-duracao";
import type { RecursoVinculo, VeiculoTipo } from "@/types";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { carregarParceiros, type ParceiroSugestao } from "@/lib/parceiros";
import {
  formatarLocaisParceiros,
  mapEntregasDb,
  mapFornecedoresDb,
  type ParceiroViagemLinha,
} from "@/lib/viagem-parceiros-viagem";
import { isFrota } from "@/lib/viagem-validation";

export type AcompanhamentoEntrega = ParceiroViagemLinha & {
  local_entrega: string;
};

export type AcompanhamentoFornecedor = ParceiroViagemLinha & {
  local_fornecedor: string;
};

export type AcompanhamentoVeiculoPlaca = {
  placa: string;
  tipo?: VeiculoTipo | null;
};

export type AcompanhamentoViagemItem = {
  id: string;
  status: string;
  saida_em: string | null;
  chegada_prevista_em: string | null;
  local_saida: string;
  numero_cte?: string | null;
  created_at: string;
  peso_kg?: number | null;
  valor_frete?: number | null;
  placas: string;
  placas_lista: string[];
  veiculos_placas: AcompanhamentoVeiculoPlaca[];
  fornecedor_atual_ordem?: number | null;
  entrega_atual_ordem?: number | null;
  motorista_nome: string;
  motorista_telefone?: string | null;
  motorista_vinculo?: RecursoVinculo | null;
  veiculos_label: string;
  fornecedores: AcompanhamentoFornecedor[];
  entregas: AcompanhamentoEntrega[];
};

export async function fetchFornecedoresAcompanhamento(): Promise<ParceiroSugestao[]> {
  const parceiros = await carregarParceiros();
  return parceiros.filter((p) => p.tipo === "fornecedor");
}

export async function fetchViagensAcompanhamento(): Promise<AcompanhamentoViagemItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagens")
    .select(
      `
      id, status, saida_em, chegada_prevista_em, local_saida, numero_cte,
      created_at, peso_kg, valor_frete,
      fornecedor_atual_ordem, entrega_atual_ordem,
      motoristas ( nome_completo, telefone, vinculo ),
      veiculos ( nome, placa, tipo ),
      viagem_veiculos ( ordem, veiculos ( nome, placa, tipo ) ),
      viagem_fornecedores ( ordem, local_fornecedor ),
      viagem_entregas ( ordem, local_entrega )
    `
    )
    .order("saida_em", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const motoristaRaw = row.motoristas as
      | { nome_completo: string; telefone?: string | null; vinculo?: RecursoVinculo }
      | { nome_completo: string; telefone?: string | null; vinculo?: RecursoVinculo }[]
      | null;
    const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;

    const vv = row.viagem_veiculos as
      | {
          ordem: number;
          veiculos:
            | { nome: string; placa: string; tipo?: VeiculoTipo | null }
            | { nome: string; placa: string; tipo?: VeiculoTipo | null }[];
        }[]
      | null;
    const veiculosViagem = (vv ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => {
        const v = item.veiculos;
        return Array.isArray(v) ? v[0] : v;
      })
      .filter(
        (v): v is { nome: string; placa: string; tipo?: VeiculoTipo | null } => !!v
      );

    const veiculoRaw = row.veiculos as
      | { nome: string; placa: string; tipo?: VeiculoTipo | null }
      | { nome: string; placa: string; tipo?: VeiculoTipo | null }[]
      | null;
    const veiculoFallback = Array.isArray(veiculoRaw) ? veiculoRaw[0] : veiculoRaw;
    const listaVeiculos =
      veiculosViagem.length > 0
        ? veiculosViagem
        : veiculoFallback
          ? [veiculoFallback]
          : [];
    const placas = listaVeiculos.map((v) => v.placa).filter(Boolean).join(" · ") || "—";
    const placasLista = listaVeiculos.map((v) => v.placa).filter(Boolean);
    const veiculosPlacas: AcompanhamentoVeiculoPlaca[] = listaVeiculos
      .filter((v) => v.placa)
      .map((v) => ({ placa: v.placa, tipo: v.tipo ?? null }));

    const fornecedoresLinhas = mapFornecedoresDb(
      row.viagem_fornecedores as { ordem: number; local_fornecedor: string }[] | null
    );
    const fornecedores: AcompanhamentoFornecedor[] =
      fornecedoresLinhas.length > 0
        ? fornecedoresLinhas.map((f) => ({
            ...f,
            local_fornecedor: f.texto,
          }))
        : row.local_saida
          ? [{ ordem: 1, texto: row.local_saida, local_fornecedor: row.local_saida }]
          : [];

    const entregasLinhas = mapEntregasDb(
      row.viagem_entregas as { ordem: number; local_entrega: string }[] | null
    );
    const entregas: AcompanhamentoEntrega[] = entregasLinhas.map((e) => ({
      ...e,
      local_entrega: e.texto,
    }));

    const localSaida =
      fornecedores.length > 0
        ? formatarLocaisParceiros(fornecedores)
        : (row.local_saida as string);

    return {
      id: row.id,
      status: row.status as string,
      saida_em: row.saida_em,
      chegada_prevista_em: row.chegada_prevista_em,
      local_saida: localSaida,
      numero_cte: row.numero_cte,
      created_at: row.created_at as string,
      peso_kg: row.peso_kg != null ? Number(row.peso_kg) : null,
      valor_frete: row.valor_frete != null ? Number(row.valor_frete) : null,
      placas,
      placas_lista: placasLista,
      veiculos_placas: veiculosPlacas,
      fornecedor_atual_ordem: row.fornecedor_atual_ordem,
      entrega_atual_ordem: row.entrega_atual_ordem,
      motorista_nome: motorista?.nome_completo ?? "—",
      motorista_telefone: motorista?.telefone ?? null,
      motorista_vinculo: motorista?.vinculo ?? null,
      veiculos_label: formatarVeiculosLabel(listaVeiculos),
      fornecedores,
      entregas,
    };
  });
}

function textoMatchParceiro(
  textos: (string | null | undefined)[],
  parceiro: Pick<ParceiroSugestao, "nome" | "textoCompleto">
): boolean {
  const texto = (parceiro.textoCompleto ?? "").trim().toLowerCase();
  const nome = (parceiro.nome ?? "").trim().toLowerCase();
  return textos.some((raw) => {
    const t = (raw ?? "").trim().toLowerCase();
    if (!t) return false;
    if (t === texto) return true;
    return nome.length > 0 && t.startsWith(nome);
  });
}

/** Viagem que inclui o fornecedor em alguma origem. */
export function viagemMatchFornecedorLocais(
  locaisFornecedor: (string | null | undefined)[],
  localSaida: string | null | undefined,
  fornecedor: Pick<ParceiroSugestao, "nome" | "textoCompleto">
): boolean {
  const locais = locaisFornecedor
    .map((l) => (l ?? "").trim())
    .filter(Boolean);
  const textos =
    locais.length > 0
      ? locais
      : [(localSaida ?? "").trim()].filter(Boolean);
  if (textos.length === 0) return false;
  return textoMatchParceiro(textos, fornecedor);
}

/** Viagem que inclui o fornecedor em alguma origem. */
export function viagemMatchFornecedor(
  viagem: AcompanhamentoViagemItem,
  fornecedor: Pick<ParceiroSugestao, "nome" | "textoCompleto">
): boolean {
  return viagemMatchFornecedorLocais(
    viagem.fornecedores.map((f) => f.local_fornecedor),
    viagem.local_saida,
    fornecedor
  );
}

function encurtarTexto(texto: string, max = 42): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function resumoParadas(
  viagem: AcompanhamentoViagemItem,
  statusLabel: string
): string {
  const partes: string[] = [];
  const multiForn = viagem.fornecedores.length > 1;
  const multiEnt = viagem.entregas.length > 1;

  if (multiForn) {
    const ordemF = viagem.fornecedor_atual_ordem;
    const forn = ordemF
      ? viagem.fornecedores.find((f) => f.ordem === ordemF)
      : undefined;
    if (forn) {
      partes.push(`Origem ${ordemF} — ${encurtarTexto(forn.local_fornecedor, 22)}`);
    } else {
      partes.push(`${viagem.fornecedores.length} fornecedores`);
    }
  } else if (viagem.fornecedores.length === 1) {
    partes.push(`Origem: ${encurtarTexto(viagem.fornecedores[0].local_fornecedor, 28)}`);
  }

  if (multiEnt) {
    const ordemE = viagem.entrega_atual_ordem;
    const ent = ordemE ? viagem.entregas.find((e) => e.ordem === ordemE) : undefined;
    if (ent) {
      partes.push(`Entrega ${ordemE} — ${encurtarTexto(ent.local_entrega, 22)}`);
    } else {
      partes.push(`${viagem.entregas.length} entregas`);
    }
  } else if (viagem.entregas.length === 1) {
    partes.push(`Destino: ${encurtarTexto(viagem.entregas[0].local_entrega, 28)}`);
  }

  partes.push(statusLabel);
  return partes.join(" · ");
}

export function textoResumoCurto(
  viagem: AcompanhamentoViagemItem,
  statusLabel: string
): string {
  return resumoParadas(viagem, statusLabel);
}

function linhasListaParceiros(
  titulo: string,
  itens: { ordem: number; texto: string }[],
  ordemAtual?: number | null,
  iconePadrao = "📍"
): string[] {
  if (!itens.length) return [];
  const linhas = ["", `*${titulo}:*`];
  for (const item of itens) {
    const atual = item.ordem === ordemAtual;
    const icone = atual ? "✅" : iconePadrao;
    const sufixo = atual ? " _(atual)_" : "";
    linhas.push(`${icone} ${item.ordem}) ${item.texto}${sufixo}`);
  }
  return linhas;
}

export function formatarTextoWhatsAppAcompanhamento(
  viagem: AcompanhamentoViagemItem,
  statusLabel: string
): string {
  const linhas: string[] = [
    "🚛 *MEB Transportes — Acompanhamento*",
    "",
    `👤 *Motorista:* ${viagem.motorista_nome}`,
  ];

  if (viagem.motorista_telefone) {
    linhas.push(`📱 *Telefone:* ${viagem.motorista_telefone}`);
  }

  linhas.push(
    `🚚 *Veículo:* ${viagem.veiculos_label}`,
    `📍 *Status:* ${statusLabel}`,
    `🏁 *Saída:* ${
      viagem.saida_em
        ? new Date(viagem.saida_em).toLocaleString("pt-BR")
        : "A definir"
    }`
  );

  if (viagem.chegada_prevista_em) {
    linhas.push(
      `🕐 *Chegada:* ${new Date(viagem.chegada_prevista_em).toLocaleString("pt-BR")}`
    );
    if (viagem.saida_em) {
      const duracao = formatarDuracaoViagem(viagem.saida_em, viagem.chegada_prevista_em);
      if (duracao) {
        linhas.push(`⏱ *Duração:* ${duracao}`);
      }
    }
  }

  if (viagem.numero_cte) {
    linhas.push(`📋 *CTE:* ${viagem.numero_cte}`);
  }

  const ordemForn = viagem.fornecedor_atual_ordem;
  const fornAtual = ordemForn
    ? viagem.fornecedores.find((f) => f.ordem === ordemForn)
    : undefined;

  if (fornAtual) {
    linhas.push("", `📤 *Fornecedor atual:* ${ordemForn} — ${fornAtual.local_fornecedor}`);
  }

  linhas.push(
    ...linhasListaParceiros(
      viagem.fornecedores.length > 1 ? "Fornecedores (origem)" : "Origem (fornecedor)",
      viagem.fornecedores.map((f) => ({ ordem: f.ordem, texto: f.local_fornecedor })),
      ordemForn,
      "📤"
    )
  );

  const ordemEnt = viagem.entrega_atual_ordem;
  const entregaAtual = ordemEnt
    ? viagem.entregas.find((e) => e.ordem === ordemEnt)
    : undefined;

  if (entregaAtual) {
    linhas.push("", `📦 *Entrega atual:* ${ordemEnt} — ${entregaAtual.local_entrega}`);
  }

  linhas.push(
    ...linhasListaParceiros(
      viagem.entregas.length > 1 ? "Entregas (destino)" : "Entrega",
      viagem.entregas.map((e) => ({ ordem: e.ordem, texto: e.local_entrega })),
      ordemEnt,
      "📦"
    )
  );

  linhas.push(
    "",
    `🕒 _Atualizado: ${new Date().toLocaleString("pt-BR")}_`
  );

  return linhas.join("\n");
}

export function textoResumoAcompanhamento(
  viagem: AcompanhamentoViagemItem,
  statusLabel: string
): string {
  const base = `${viagem.veiculos_label} com ${viagem.motorista_nome}`;
  return `${base} — ${resumoParadas(viagem, statusLabel)}`;
}

export function viagemPrecisaSelecionarParada(viagem: AcompanhamentoViagemItem): boolean {
  const faltaForn =
    viagem.fornecedores.length > 1 && viagem.fornecedor_atual_ordem == null;
  const faltaEnt =
    viagem.entregas.length > 1 && viagem.entrega_atual_ordem == null;
  return faltaForn || faltaEnt;
}

function resolverNomeFornecedorTexto(
  texto: string,
  parceiros: ParceiroSugestao[]
): string {
  const forn = parceiros.find((p) => textoMatchParceiro([texto], p));
  if (forn) return forn.nome;
  const idx = texto.indexOf(" — ");
  if (idx > 0) return texto.slice(0, idx).trim();
  return texto.trim() || "—";
}

/** Nomes dos fornecedores (origem) da viagem para relatórios. */
export function nomesFornecedoresViagem(
  viagem: Pick<AcompanhamentoViagemItem, "fornecedores" | "local_saida">,
  parceiros: ParceiroSugestao[]
): string {
  const textos = viagem.fornecedores.map((f) => f.local_fornecedor).filter(Boolean);
  if (!textos.length && viagem.local_saida?.trim()) {
    textos.push(viagem.local_saida.trim());
  }
  const nomes = textos.map((t) => resolverNomeFornecedorTexto(t, parceiros));
  return [...new Set(nomes.filter((n) => n && n !== "—"))].join(" · ") || "—";
}

export type AcompanhamentoRelatorioFiltros = {
  de: string;
  ate: string;
  status: string;
  fornecedorId: string;
  vinculo: "" | RecursoVinculo;
  placa: string;
};

/** Placas elegíveis no relatório por veículo (caminhão e cavalo; carretas ignoradas). */
export function placaElegivelRelatorioAcompanhamento(tipo?: VeiculoTipo | null): boolean {
  return tipo === "caminhao" || tipo === "cavalo";
}

export function placasRelatorioViagem(viagem: AcompanhamentoViagemItem): string[] {
  return viagem.veiculos_placas
    .filter((v) => placaElegivelRelatorioAcompanhamento(v.tipo))
    .map((v) => v.placa)
    .filter(Boolean);
}

export function viagemMatchPlaca(viagem: AcompanhamentoViagemItem, placa: string): boolean {
  const alvo = normalizarPlaca(placa);
  if (!alvo) return true;
  return placasRelatorioViagem(viagem).some((p) => normalizarPlaca(p) === alvo);
}

export function listarPlacasAcompanhamento(viagens: AcompanhamentoViagemItem[]): string[] {
  const mapa = new Map<string, string>();
  for (const v of viagens) {
    for (const placa of placasRelatorioViagem(v)) {
      const chave = normalizarPlaca(placa);
      if (chave && !mapa.has(chave)) mapa.set(chave, placa);
    }
  }
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function resolverPlacaRelatorioAcompanhamento(
  placas: string[],
  entrada: string
): string | null {
  const alvo = normalizarPlaca(entrada.trim());
  if (!alvo) return null;
  return placas.find((p) => normalizarPlaca(p) === alvo) ?? null;
}

export type AcompanhamentoRelatorioResumoPlaca = {
  qtdViagens: number;
  pesoTotalKg: number;
  faturamentoBruto: number;
};

export function resumirViagensPorPlaca(
  viagens: AcompanhamentoViagemItem[]
): AcompanhamentoRelatorioResumoPlaca {
  let pesoTotalKg = 0;
  let faturamentoBruto = 0;
  for (const v of viagens) {
    if (v.peso_kg != null && Number(v.peso_kg) > 0) {
      pesoTotalKg += Number(v.peso_kg);
    }
    if (v.valor_frete != null && Number(v.valor_frete) > 0) {
      faturamentoBruto += Number(v.valor_frete);
    }
  }
  return {
    qtdViagens: viagens.length,
    pesoTotalKg,
    faturamentoBruto,
  };
}

export type AcompanhamentoViagensPorPlaca = {
  placa: string;
  viagens: AcompanhamentoViagemItem[];
};

/** Agrupa viagens filtradas por placa (viagem com várias placas entra em cada grupo). */
export function agruparViagensPorPlaca(
  viagens: AcompanhamentoViagemItem[]
): AcompanhamentoViagensPorPlaca[] {
  return listarPlacasAcompanhamento(viagens)
    .map((placa) => ({
      placa,
      viagens: viagens.filter((v) => viagemMatchPlaca(v, placa)),
    }))
    .filter((g) => g.viagens.length > 0);
}

function dataReferenciaViagem(viagem: AcompanhamentoViagemItem): string {
  return viagem.saida_em ?? viagem.created_at;
}

/** Filtra viagens para o relatório de acompanhamento. */
export function filtrarViagensAcompanhamentoRelatorio(
  viagens: AcompanhamentoViagemItem[],
  filtros: AcompanhamentoRelatorioFiltros,
  fornecedor?: ParceiroSugestao | null
): AcompanhamentoViagemItem[] {
  return viagens.filter((v) => {
    if (!dataNoIntervalo(dataReferenciaViagem(v), filtros.de, filtros.ate)) {
      return false;
    }
    if (filtros.vinculo) {
      const frota = isFrota(v.motorista_vinculo);
      if (filtros.vinculo === "frota" && !frota) return false;
      if (filtros.vinculo === "terceiro" && frota) return false;
    }
    if (filtros.status) {
      const statusViagem = v.status === "DESCARREGANDO" ? "DESCARGA EM ANDAMENTO" : v.status;
      if (statusViagem !== filtros.status) return false;
    }
    if (fornecedor && !viagemMatchFornecedor(v, fornecedor)) return false;
    if (filtros.placa && !viagemMatchPlaca(v, filtros.placa)) return false;
    return true;
  });
}
