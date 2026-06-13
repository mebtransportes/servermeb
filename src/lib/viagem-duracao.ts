import { differenceInMinutes } from "date-fns";

/** Duração entre saída e chegada em dias e horas (pt-BR). */
export function formatarDuracaoViagem(saidaEm: string, chegadaEm: string): string | null {
  const saida = new Date(saidaEm);
  const chegada = new Date(chegadaEm);
  if (Number.isNaN(saida.getTime()) || Number.isNaN(chegada.getTime())) return null;
  if (chegada <= saida) return null;

  const totalMinutos = differenceInMinutes(chegada, saida);
  const dias = Math.floor(totalMinutos / (24 * 60));
  const horas = Math.floor((totalMinutos % (24 * 60)) / 60);

  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);
  if (horas > 0) partes.push(`${horas} ${horas === 1 ? "hora" : "horas"}`);
  if (partes.length === 0) return "menos de 1 hora";

  return partes.join(" e ");
}
