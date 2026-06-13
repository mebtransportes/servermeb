export type RecebimentoStatus = "pendente" | "pago" | "vencido";

export type ViagemCanhoto = {
  id: string;
  viagem_id: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  created_at?: string;
};

export type RecebimentoEncargoTipo = "diaria" | "descarga";

export type RecebimentoEncargoStatus = "sem_data" | "pendente" | "pago";

export const RECEBIMENTO_ENCARGO_LABEL: Record<RecebimentoEncargoTipo, string> = {
  diaria: "Diária",
  descarga: "Descarga",
};

export const RECEBIMENTO_ENCARGO_STATUS_LABEL: Record<RecebimentoEncargoStatus, string> = {
  sem_data: "Sem data",
  pendente: "Pendente",
  pago: "Pago",
};

export type ViagemRecebimentoEncargo = {
  id: string;
  recebimento_id: string;
  tipo: RecebimentoEncargoTipo;
  valor: number;
  numero_cte?: string | null;
  data_recebimento?: string | null;
  status: RecebimentoEncargoStatus;
  created_at?: string;
  updated_at?: string;
};

export type ViagemRecebimento = {
  id: string;
  viagem_id: string;
  motorista_nome: string;
  veiculos_placas: string;
  empresa: string;
  valor_frete_total: number;
  valor_frete_liquido: number;
  valor_descargas_adicionais: number;
  valor_diarias: number;
  data_recebimento?: string | null;
  status: RecebimentoStatus;
  observacao?: string | null;
  numero_cte?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const RECEBIMENTO_STATUS_LABEL: Record<RecebimentoStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
};

export function totalEncargos(
  encargos: Pick<ViagemRecebimentoEncargo, "valor">[] | undefined
) {
  return (encargos ?? []).reduce((s, e) => s + (Number(e.valor) || 0), 0);
}

export function calcularTotalAReceber(r: Pick<
  ViagemRecebimento,
  "valor_frete_liquido" | "valor_descargas_adicionais" | "valor_diarias"
> & { encargos?: Pick<ViagemRecebimentoEncargo, "valor">[] }) {
  const encargosTotal =
    r.encargos && r.encargos.length > 0
      ? totalEncargos(r.encargos)
      : (Number(r.valor_descargas_adicionais) || 0) + (Number(r.valor_diarias) || 0);
  return (Number(r.valor_frete_liquido) || 0) + encargosTotal;
}
