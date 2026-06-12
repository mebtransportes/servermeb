export type RecebimentoStatus = "pendente" | "pago" | "vencido";

export type ViagemCanhoto = {
  id: string;
  viagem_id: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  created_at?: string;
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

export function calcularTotalAReceber(r: Pick<
  ViagemRecebimento,
  "valor_frete_liquido" | "valor_descargas_adicionais"
>) {
  return (
    (Number(r.valor_frete_liquido) || 0) +
    (Number(r.valor_descargas_adicionais) || 0)
  );
}
