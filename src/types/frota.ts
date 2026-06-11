import type {
  ManutencaoPagamentoForma,
  ManutencaoPagamentoModalidade,
  ManutencaoParcela,
} from "@/lib/manutencao-pagamento";

export type FrotaManutencaoStatus = "AGENDADO" | "EM ANDAMENTO" | "FINALIZADO";

export type ManutencaoCard = {
  id: string;
  source: "preventiva" | "viagem";
  nome: string;
  descricao?: string | null;
  onde: string;
  dataRef: string;
  horaRef?: string | null;
  valor: number;
  status: FrotaManutencaoStatus;
  motoristaNome?: string;
  veiculoId?: string | null;
  veiculoPlaca?: string;
  km?: number | null;
  dataProximaManutencao?: string | null;
  nota_fiscal_path?: string | null;
  comprovante_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_nome?: string | null;
  viagemRecursoId?: string;
  frotaId?: string;
  pagamentoModalidade?: ManutencaoPagamentoModalidade | null;
  pagamentoForma?: ManutencaoPagamentoForma | null;
  pagamentoVencimento?: string | null;
  parcelas?: ManutencaoParcela[];
};

export type AbastecimentoCard = {
  id: string;
  source: "manual" | "viagem";
  valor: number;
  km?: number | null;
  litros?: number | null;
  litrosTotais?: number | null;
  descricao?: string | null;
  dataHora: string;
  postoNome?: string;
  veiculoLabel?: string;
  veiculoPlaca?: string;
  motoristaNome?: string;
  nota_fiscal_path?: string | null;
  comprovante_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_nome?: string | null;
  viagemRecursoId?: string;
  frotaId?: string;
};
