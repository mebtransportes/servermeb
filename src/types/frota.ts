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
  viagemRecursoId?: string;
  frotaId?: string;
};

export type AbastecimentoCard = {
  id: string;
  source: "manual" | "viagem";
  valor: number;
  km?: number | null;
  litros?: number | null;
  descricao?: string | null;
  dataHora: string;
  postoNome?: string;
  veiculoLabel?: string;
  motoristaNome?: string;
  viagemRecursoId?: string;
  frotaId?: string;
};
