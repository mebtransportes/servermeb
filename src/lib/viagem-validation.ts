import { isValid, parseISO, startOfDay } from "date-fns";
import type { Motorista, Veiculo } from "@/types";

function isVencido(data: string | null | undefined): boolean {
  if (!data) return true;
  const d = parseISO(data);
  if (!isValid(d)) return true;
  return startOfDay(d) < startOfDay(new Date());
}

export type ResultadoApto = {
  apto: boolean;
  problemas: string[];
};

export function validarMotorista(m: Motorista): ResultadoApto {
  const problemas: string[] = [];

  if (isVencido(m.cnh_vencimento)) {
    problemas.push(
      m.cnh_vencimento
        ? `CNH vencida (${m.cnh_vencimento})`
        : "CNH sem data de vencimento cadastrada"
    );
  }

  if (isVencido(m.toxicologico_vencimento)) {
    problemas.push(
      m.toxicologico_vencimento
        ? `Exame toxicológico vencido (${m.toxicologico_vencimento})`
        : "Exame toxicológico sem vencimento cadastrado"
    );
  }

  return { apto: problemas.length === 0, problemas };
}

export function validarVeiculo(v: Veiculo): ResultadoApto {
  const problemas: string[] = [];

  if (isVencido(v.crlv_vencimento)) {
    problemas.push(
      v.crlv_vencimento
        ? `CRLV vencido (${v.crlv_vencimento})`
        : "CRLV sem vencimento cadastrado"
    );
  }

  if (isVencido(v.ipva_vencimento)) {
    problemas.push(
      v.ipva_vencimento
        ? `IPVA vencido (${v.ipva_vencimento})`
        : "IPVA sem vencimento cadastrado"
    );
  }

  return { apto: problemas.length === 0, problemas };
}

export const VIAGEM_STATUS = [
  "EM ANDAMENTO",
  "EM CARREGAMENTO",
  "EM ROTA",
  "CHEGOU AO DESTINO DE ENTREGA",
  "CHEGOU AO DESTINO FINAL",
  "DESCARREGANDO",
  "PARADO NA ESTRADA",
  "EM ATRASO",
  "FINALIZADO",
] as const;

export type ViagemStatus = (typeof VIAGEM_STATUS)[number];

export const ANEXOS_VIAGEM_CATEGORIAS_UNICAS = [
  "CTE",
  "CIOT",
  "MDFE",
  "ENTREGAS",
] as const;

export const ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS = [
  "ROMANEIO",
  "NOTAS_FISCAIS",
] as const;

export const ANEXOS_VIAGEM_CATEGORIAS = [
  ...ANEXOS_VIAGEM_CATEGORIAS_UNICAS,
  ...ANEXOS_VIAGEM_CATEGORIAS_MULTIPLAS,
] as const;

export const VEICULO_TIPO_OPCOES = [
  { value: "caminhao", label: "Caminhão" },
  { value: "carreta", label: "Carreta" },
  { value: "cavalo", label: "Cavalo" },
] as const;

export const TIPOS_TRAJETO = [
  { value: "ida", label: "Somente ida" },
  { value: "volta", label: "Somente volta" },
  { value: "ida_volta", label: "Ida e volta" },
] as const;
