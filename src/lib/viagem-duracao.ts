import { differenceInMinutes } from "date-fns";

/** Duração entre duas datas em dias e horas (pt-BR). */
export function formatarDuracaoViagem(inicioEm: string, fimEm: string): string | null {
  const inicio = new Date(inicioEm);
  const fim = new Date(fimEm);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null;
  if (fim <= inicio) return null;

  const totalMinutos = differenceInMinutes(fim, inicio);
  const dias = Math.floor(totalMinutos / (24 * 60));
  const horas = Math.floor((totalMinutos % (24 * 60)) / 60);

  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);
  if (horas > 0) partes.push(`${horas} ${horas === 1 ? "hora" : "horas"}`);
  if (partes.length === 0) return "menos de 1 hora";

  return partes.join(" e ");
}

export type ViagemComDuracao = {
  data_contratacao?: string | null;
  saida_em?: string | null;
  data_embarque?: string | null;
  chegada_prevista_em?: string | null;
  chegada_em?: string | null;
  duracao_base_saida?: boolean;
};

/**
 * Início do intervalo de duração até a chegada.
 * Legado (chegada já cadastrada antes da mudança): saída.
 * Demais viagens: contratação (com fallback para saída).
 */
export function inicioDuracaoViagem(viagem: ViagemComDuracao): string | null {
  const chegada = viagem.chegada_prevista_em ?? viagem.chegada_em ?? null;
  if (!chegada) return null;

  const saida = viagem.saida_em ?? viagem.data_embarque ?? null;
  if (viagem.duracao_base_saida) {
    return saida;
  }

  return viagem.data_contratacao?.trim() || saida;
}

/** Duração até a chegada conforme a regra legada ou nova. */
export function duracaoViagemAteChegada(viagem: ViagemComDuracao): string | null {
  const chegada = viagem.chegada_prevista_em ?? viagem.chegada_em ?? null;
  if (!chegada) return null;

  const inicio = inicioDuracaoViagem(viagem);
  if (!inicio) return null;

  return formatarDuracaoViagem(inicio, chegada);
}

/** @deprecated Use duracaoViagemAteChegada */
export const duracaoContratacaoAteChegada = duracaoViagemAteChegada;
