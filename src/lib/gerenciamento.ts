import { differenceInCalendarDays, parseISO, isValid, startOfDay } from "date-fns";

export const DOMINIO_ALERTA_DIAS = [30, 15, 2] as const;

export type DominioAlertaNivel = "ok" | "30" | "15" | "2" | "vencido";

export function diasRestantesDominio(expiraEm: string | null | undefined): number | null {
  if (!expiraEm) return null;
  const d = parseISO(expiraEm.slice(0, 10));
  if (!isValid(d)) return null;
  return differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
}

export function nivelAlertaDominio(dias: number | null): DominioAlertaNivel {
  if (dias == null) return "ok";
  if (dias < 0) return "vencido";
  if (dias <= 2) return "2";
  if (dias <= 15) return "15";
  if (dias <= 30) return "30";
  return "ok";
}

export function mensagemAlertaDominio(dias: number | null): string | null {
  const nivel = nivelAlertaDominio(dias);
  if (nivel === "ok" || dias == null) return null;
  if (nivel === "vencido") {
    return `Domínio vencido há ${Math.abs(dias)} dia(s). Renove o quanto antes.`;
  }
  if (nivel === "2") {
    return `Domínio expira em ${dias} dia(s). Renovação urgente.`;
  }
  if (nivel === "15") {
    return `Domínio expira em ${dias} dia(s). Programe a renovação.`;
  }
  return `Domínio expira em ${dias} dia(s). Lembrete de renovação.`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : v < 10 ? 1 : 0;
  return `${v.toFixed(digits)} ${units[i]}`;
}
