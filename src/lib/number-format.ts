/** Formata dígitos digitados no padrão pt-BR (1.234,56). */
export function formatBrWhileTyping(digitsOnly: string, decimalPlaces: number): string {
  if (!digitsOnly) return "";
  const num = Number(digitsOnly) / 10 ** decimalPlaces;
  if (decimalPlaces === 0) {
    return num.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}

/** Aplica máscara a partir do valor exibido no input (extrai só dígitos). */
export function maskBrNumberInput(inputValue: string, decimalPlaces: number): string {
  const digits = inputValue.replace(/\D/g, "");
  return formatBrWhileTyping(digits, decimalPlaces);
}

/** Converte texto formatado pt-BR (ou decimal com ponto) para número. */
export function parseBrNumber(formatted: string): number | null {
  const trimmed = formatted.trim();
  if (!trimmed) return null;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let normalized: string;

  if (hasComma && hasDot) {
    // 1.234,56 → 1234.56
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // 12,2 → 12.2
    normalized = trimmed.replace(",", ".");
  } else if (hasDot) {
    const parts = trimmed.split(".");
    if (parts.length > 2) {
      // 1.234.567 → milhares
      normalized = trimmed.replace(/\./g, "");
    } else {
      // Um único ponto: trata como decimal (ex.: 12.2 → 12.2).
      // Evita o bug em que "12.2" virava 122 e ICMS ia para 100%.
      normalized = trimmed;
    }
  } else {
    normalized = trimmed;
  }

  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}

/** Número do banco → string para exibir no input mascarado. */
export function numberToBrInput(
  value: number | null | undefined,
  decimalPlaces: number
): string {
  if (value == null || Number.isNaN(value)) return "";
  const digits = String(Math.round(value * 10 ** decimalPlaces));
  return formatBrWhileTyping(digits, decimalPlaces);
}

/** String numérica simples (ex. do banco) → input mascarado. */
export function rawNumberStringToBrInput(
  raw: string | number | null | undefined,
  decimalPlaces: number
): string {
  if (raw == null || raw === "") return "";
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (Number.isNaN(n)) return "";
  return numberToBrInput(n, decimalPlaces);
}

/** Casas decimais padrão para quilometragem (odômetro). */
export const KM_DECIMAL_PLACES = 1;

/** Exibe KM no padrão pt-BR com 1 decimal (ex.: 100.134,1). */
export function formatKmBr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: KM_DECIMAL_PLACES,
    maximumFractionDigits: KM_DECIMAL_PLACES,
  });
}

/** Arredonda quilometragem para 1 casa decimal. */
export function roundKm(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 10) / 10;
}

/** Número → string mascarada para input de KM. */
export function kmToBrInput(value: number | string | null | undefined): string {
  return rawNumberStringToBrInput(value, KM_DECIMAL_PLACES);
}

/** Converte texto formatado pt-BR de KM para número (1 decimal). */
export function parseBrKm(formatted: string): number | null {
  return roundKm(parseBrNumber(formatted));
}
