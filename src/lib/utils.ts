import { differenceInYears, parseISO, isValid } from "date-fns";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

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
