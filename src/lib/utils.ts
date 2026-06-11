import { differenceInYears, parseISO, isValid } from "date-fns";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Card padrão: branco semitransparente, borda neutra */
export const mebCard =
  "rounded-xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-sm";

export const mebCardSm =
  "rounded-lg border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-sm";

export const mebFilterActive =
  "border border-emerald-200 bg-emerald-50 text-emerald-800";

export const mebFilterInactive =
  "border border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white/90";

export const mebFormSection =
  "space-y-4 rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm";

export const mebFormSubsection =
  "rounded-lg border border-slate-200/80 bg-slate-50/80 p-4";

export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const data = parseISO(dataNascimento);
  if (!isValid(data)) return null;
  return differenceInYears(new Date(), data);
}

export function buildMapsLink(lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return "";
}

export function buildEnderecoCompleto(parts: {
  nome?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  complemento?: string;
  localProximo?: string;
  telefone?: string;
  mapsLink?: string;
}): string {
  const linhas: string[] = [];
  if (parts.nome) linhas.push(`*${parts.nome}*`);
  const end = [
    parts.logradouro,
    parts.numero && `nº ${parts.numero}`,
    parts.bairro,
    parts.cidade && parts.estado ? `${parts.cidade}/${parts.estado}` : parts.cidade,
    parts.cep && `CEP ${parts.cep}`,
  ]
    .filter(Boolean)
    .join(", ");
  if (end) linhas.push(end);
  if (parts.complemento) linhas.push(parts.complemento);
  if (parts.localProximo) linhas.push(`Próximo: ${parts.localProximo}`);
  if (parts.telefone) linhas.push(`Tel: ${parts.telefone}`);
  if (parts.mapsLink) linhas.push(parts.mapsLink);
  return linhas.join("\n");
}

export async function fetchCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.erro) return null;
  return {
    logradouro: data.logradouro as string,
    bairro: data.bairro as string,
    cidade: data.localidade as string,
    estado: data.uf as string,
  };
}
