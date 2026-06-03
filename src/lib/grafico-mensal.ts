import { format, parseISO, isValid, subMonths, startOfMonth, endOfMonth, compareAsc } from "date-fns";
import { ptBR } from "date-fns/locale";

export type PontoGraficoMensal = {
  chave: string;
  label: string;
  total: number;
  variacaoPct: number | null;
};

/** Soma despesas por mês (últimos 6 meses) a partir de itens com data + valor. */
export function buildGraficoMensalDespesas(
  items: { dataRef: string; valor: number }[]
): PontoGraficoMensal[] {
  const agora = new Date();
  const meses: { chave: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(agora, i);
    meses.push({
      chave: format(d, "yyyy-MM"),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }

  function noMes(dateStr: string, start: Date, end: Date) {
    const d = parseISO(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
    if (!isValid(d)) return false;
    return d >= start && d <= end;
  }

  const mapa = new Map<string, number>();
  for (const m of meses) mapa.set(m.chave, 0);

  for (const item of items) {
    for (const m of meses) {
      if (noMes(item.dataRef, m.start, m.end)) {
        mapa.set(m.chave, (mapa.get(m.chave) ?? 0) + item.valor);
      }
    }
  }

  const chaves = [...mapa.keys()].sort(compareAsc);
  return chaves.map((chave, i) => {
    const total = mapa.get(chave) ?? 0;
    const anterior = i > 0 ? (mapa.get(chaves[i - 1]) ?? 0) : null;
    const [y, mo] = chave.split("-").map(Number);
    const variacaoPct =
      anterior == null
        ? null
        : anterior === 0
          ? total > 0
            ? 100
            : 0
          : ((total - anterior) / anterior) * 100;
    return {
      chave,
      label: format(new Date(y, mo - 1, 1), "MMM/yy", { locale: ptBR }),
      total,
      variacaoPct,
    };
  });
}
