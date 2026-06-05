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
  veiculoPlaca?: string;
  km?: number | null;
  nota_fiscal_path?: string | null;
  comprovante_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_nome?: string | null;
  viagemRecursoId?: string;
  frotaId?: string;
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
  motoristaNome?: string;
  nota_fiscal_path?: string | null;
  comprovante_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_nome?: string | null;
  viagemRecursoId?: string;
  frotaId?: string;
};
