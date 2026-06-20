import { createClient } from "@/lib/supabase/client";
import { formatarDuracaoViagem } from "@/lib/viagem-duracao";
import type { RecursoVinculo } from "@/types";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { carregarParceiros, type ParceiroSugestao } from "@/lib/parceiros";
import {
  formatarLocaisParceiros,
  mapEntregasDb,
  mapFornecedoresDb,
  type ParceiroViagemLinha,
} from "@/lib/viagem-parceiros-viagem";

export type AcompanhamentoEntrega = ParceiroViagemLinha & {
  local_entrega: string;
};

export type AcompanhamentoFornecedor = ParceiroViagemLinha & {
  local_fornecedor: string;
};

export type AcompanhamentoViagemItem = {
  id: string;
  status: string;
  saida_em: string | null;
  chegada_prevista_em: string | null;
  local_saida: string;
  numero_cte?: string | null;
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
      fornecedor_atual_ordem, entrega_atual_ordem,
      motoristas ( nome_completo, telefone, vinculo ),
      veiculos ( nome, placa ),
      viagem_veiculos ( ordem, veiculos ( nome, placa ) ),
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
      | { ordem: number; veiculos: { nome: string; placa: string } | { nome: string; placa: string }[] }[]
      | null;
    const veiculosViagem = (vv ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => {
        const v = item.veiculos;
        return Array.isArray(v) ? v[0] : v;
      })
      .filter((v): v is { nome: string; placa: string } => !!v);

    const veiculoRaw = row.veiculos as
      | { nome: string; placa: string }
      | { nome: string; placa: string }[]
      | null;
    const veiculoFallback = Array.isArray(veiculoRaw) ? veiculoRaw[0] : veiculoRaw;
    const listaVeiculos =
      veiculosViagem.length > 0
        ? veiculosViagem
        : veiculoFallback
          ? [veiculoFallback]
          : [];

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

function textoMatchParceiro(textos: string[], parceiro: Pick<ParceiroSugestao, "nome" | "textoCompleto">): boolean {
  const texto = parceiro.textoCompleto.trim().toLowerCase();
  const nome = parceiro.nome.trim().toLowerCase();
  return textos.some((raw) => {
    const t = raw.trim().toLowerCase();
    if (!t) return false;
    if (t === texto) return true;
    return nome.length > 0 && t.startsWith(nome);
  });
}

/** Viagem que inclui o fornecedor em alguma origem. */
export function viagemMatchFornecedorLocais(
  locaisFornecedor: string[],
  localSaida: string,
  fornecedor: Pick<ParceiroSugestao, "nome" | "textoCompleto">
): boolean {
  const textos = locaisFornecedor.length > 0 ? locaisFornecedor : [localSaida];
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
