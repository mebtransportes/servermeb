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

/** Converte texto formatado pt-BR para número. */
export function parseBrNumber(formatted: string): number | null {
  const trimmed = formatted.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
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
