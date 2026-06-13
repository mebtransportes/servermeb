import { formatarDuracaoViagem } from "@/lib/viagem-duracao";

export function extrairPlacaVeiculo(veiculoLabel: string): string {
  const partes = veiculoLabel.split(" · ");
  const ultimo = partes[partes.length - 1] ?? veiculoLabel;
  const idx = ultimo.lastIndexOf(" — ");
  if (idx >= 0) return ultimo.slice(idx + 3).trim();
  return ultimo.trim();
}

export function formatDataHoraSeparados(iso: string | null | undefined): {
  data: string;
  hora: string;
} {
  if (!iso) return { data: "—", hora: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { data: "—", hora: "—" };
  return {
    data: d.toLocaleDateString("pt-BR"),
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function formatPeriodoViagem(
  saidaEm: string,
  chegadaEm: string | null | undefined
): string {
  const saida = formatDataHoraSeparados(saidaEm);
  const chegada = formatDataHoraSeparados(chegadaEm);
  const duracao =
    chegadaEm != null ? formatarDuracaoViagem(saidaEm, chegadaEm) : null;
  const trecho = `${saida.data} ${saida.hora} — ${chegada.data} ${chegada.hora}`;
  return duracao ? `${trecho} · ${duracao}` : trecho;
}

export function formatKm(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(Number(valor))) return "—";
  return Number(valor).toLocaleString("pt-BR");
}

export function formatLitros(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(Number(valor)) || Number(valor) <= 0) return "—";
  return (
    Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"
  );
}
