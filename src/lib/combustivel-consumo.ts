/** Combustíveis que entram no cálculo de KM por litro (consumo médio). */
export const COMBUSTIVEIS_CONSUMO_KM_LITRO = [
  "Diesel Aditivado",
  "Diesel BS10",
  "Diesel BS10 COMUM",
  "DIESEL S10",
  "DIESEL S10 ADITIVADO",
] as const;

function normalizarCombustivelTipo(tipo?: string | null): string {
  return (tipo ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function isArlaCombustivel(tipo?: string | null): boolean {
  return normalizarCombustivelTipo(tipo) === "arla";
}

export function isDieselComumCombustivel(tipo?: string | null): boolean {
  return normalizarCombustivelTipo(tipo) === "diesel comum";
}

export function isDieselS500Combustivel(tipo?: string | null): boolean {
  return normalizarCombustivelTipo(tipo) === "diesel s500";
}

export type CombustivelControleCategoria = "arla" | "diesel_comum" | "diesel_s500";

/** Arla, Diesel Comum e S500 — controle separado (fora do consumo KM/L). */
export function categoriaControleCombustivel(
  tipo?: string | null
): CombustivelControleCategoria | null {
  if (isArlaCombustivel(tipo)) return "arla";
  if (isDieselComumCombustivel(tipo)) return "diesel_comum";
  if (isDieselS500Combustivel(tipo)) return "diesel_s500";
  return null;
}

export function labelCombustivelControle(cat: CombustivelControleCategoria): string {
  switch (cat) {
    case "arla":
      return "Arla";
    case "diesel_comum":
      return "Diesel Comum";
    case "diesel_s500":
      return "Diesel S500";
  }
}

/** Apenas estes combustíveis entram na soma de litros para KM/L. */
export function combustivelContaNoConsumoKmLitro(tipo?: string | null): boolean {
  const norm = normalizarCombustivelTipo(tipo);
  if (!norm) return false;
  return COMBUSTIVEIS_CONSUMO_KM_LITRO.some(
    (c) => normalizarCombustivelTipo(c) === norm
  );
}

/** Litros de um abastecimento que entram no consumo médio (KM ÷ L). */
export function litrosAbastecimentoParaConsumo(opts: {
  litros?: number | null;
  combustivel_tipo?: string | null;
  abastecimento_inicial?: boolean | null;
}): number {
  if (opts.abastecimento_inicial) return 0;
  if (!combustivelContaNoConsumoKmLitro(opts.combustivel_tipo)) return 0;
  const litros = Number(opts.litros) || 0;
  return litros > 0 ? litros : 0;
}
