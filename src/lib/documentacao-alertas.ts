import { differenceInCalendarDays, isValid, parseISO, startOfDay } from "date-fns";
import type { Motorista, Veiculo } from "@/types";

export const DIAS_ALERTA_VENCIMENTO = 30;

export type StatusDocumento = "ok" | "vencendo" | "vencido" | "sem_data";

export type AlertaDocumentacao = {
  id: string;
  categoria: "motorista" | "veiculo";
  entidadeId: string;
  entidadeNome: string;
  entidadeDetalhe?: string;
  documento: string;
  dataVencimento: string | null;
  status: StatusDocumento;
  diasRestantes: number | null;
  href: string;
  /** Documento em dia exibido junto a outros avisos da mesma pessoa/veículo */
  apenasContexto?: boolean;
};

/** Normaliza DATE/ISO do Supabase para yyyy-MM-dd */
export function normalizarDataVencimento(
  data: string | null | undefined
): string | null {
  if (data == null || data === "") return null;
  const s = String(data).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return s;
}

function parseVencimentoLocal(data: string): Date {
  const norm = normalizarDataVencimento(data);
  if (!norm) return new Date(NaN);
  return parseISO(norm.includes("T") ? norm : `${norm}T12:00:00`);
}

export function statusDocumento(
  data: string | null | undefined,
  diasAlerta = DIAS_ALERTA_VENCIMENTO
): { status: StatusDocumento; diasRestantes: number | null } {
  const norm = normalizarDataVencimento(data);
  if (!norm) return { status: "sem_data", diasRestantes: null };
  const d = parseVencimentoLocal(norm);
  if (!isValid(d)) return { status: "sem_data", diasRestantes: null };
  const dias = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
  if (dias < 0) return { status: "vencido", diasRestantes: dias };
  if (dias <= diasAlerta) return { status: "vencendo", diasRestantes: dias };
  return { status: "ok", diasRestantes: dias };
}

type AlertaInput = {
  categoria: AlertaDocumentacao["categoria"];
  entidadeId: string;
  entidadeNome: string;
  entidadeDetalhe?: string;
  documento: string;
  data: string | null | undefined;
  href: string;
  apenasContexto?: boolean;
};

function criarAlerta(opts: AlertaInput): AlertaDocumentacao {
  const norm = normalizarDataVencimento(opts.data);
  const { status, diasRestantes } = statusDocumento(norm);
  return {
    id: `${opts.categoria}-${opts.entidadeId}-${opts.documento}`,
    categoria: opts.categoria,
    entidadeId: opts.entidadeId,
    entidadeNome: opts.entidadeNome,
    entidadeDetalhe: opts.entidadeDetalhe,
    documento: opts.documento,
    dataVencimento: norm,
    status,
    diasRestantes,
    href: opts.href,
    apenasContexto: opts.apenasContexto,
  };
}

type DocMonitorado = { documento: string; data: string | null | undefined };

function processarEntidade(
  lista: AlertaDocumentacao[],
  opts: {
    categoria: "motorista" | "veiculo";
    entidadeId: string;
    entidadeNome: string;
    entidadeDetalhe?: string;
    href: string;
    documentos: DocMonitorado[];
  }
) {
  const linhas = opts.documentos.map((d) =>
    criarAlerta({
      categoria: opts.categoria,
      entidadeId: opts.entidadeId,
      entidadeNome: opts.entidadeNome,
      entidadeDetalhe: opts.entidadeDetalhe,
      documento: d.documento,
      data: d.data,
      href: opts.href,
    })
  );

  const temProblema = linhas.some((l) => l.status !== "ok");
  if (!temProblema) return;

  for (const linha of linhas) {
    if (linha.status === "ok") {
      lista.push({ ...linha, apenasContexto: true });
    } else {
      lista.push(linha);
    }
  }
}

export function montarAlertas(
  motoristas: Motorista[],
  veiculos: Veiculo[]
): AlertaDocumentacao[] {
  const alertas: AlertaDocumentacao[] = [];

  for (const m of motoristas) {
    processarEntidade(alertas, {
      categoria: "motorista",
      entidadeId: m.id,
      entidadeNome: m.nome_completo,
      entidadeDetalhe: m.cpf,
      href: "/cadastro/motoristas",
      documentos: [
        { documento: "CNH", data: m.cnh_vencimento },
        { documento: "Exame toxicológico", data: m.toxicologico_vencimento },
      ],
    });
  }

  for (const v of veiculos) {
    processarEntidade(alertas, {
      categoria: "veiculo",
      entidadeId: v.id,
      entidadeNome: v.nome,
      entidadeDetalhe: v.placa,
      href: "/cadastro/veiculos",
      documentos: [
        { documento: "CRLV", data: v.crlv_vencimento },
        { documento: "IPVA", data: v.ipva_vencimento },
      ],
    });
  }

  const ordemStatus = { vencido: 0, vencendo: 1, sem_data: 2, ok: 3 };
  return alertas.sort((a, b) => {
    const sa = ordemStatus[a.status];
    const sb = ordemStatus[b.status];
    if (sa !== sb) return sa - sb;
    const da = a.diasRestantes ?? 9999;
    const db = b.diasRestantes ?? 9999;
    return da - db;
  });
}

export function resumoAlertas(alertas: AlertaDocumentacao[]) {
  const principais = alertas.filter((a) => !a.apenasContexto);
  return {
    total: principais.length,
    vencidos: principais.filter((a) => a.status === "vencido").length,
    vencendo: principais.filter((a) => a.status === "vencendo").length,
    semData: principais.filter((a) => a.status === "sem_data").length,
    motoristas: principais.filter((a) => a.categoria === "motorista").length,
    veiculos: principais.filter((a) => a.categoria === "veiculo").length,
  };
}
