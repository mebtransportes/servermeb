export type TipoPessoa = "PF" | "PJ";

export type ProfileRole = "admin" | "mecanico" | "inativo";
export type UserRole = "admin" | "mecanico";

export interface Profile {
  id: string;
  username: string;
  auth_email: string;
  role?: ProfileRole;
}

export type VeiculoTipo = "caminhao" | "carreta" | "cavalo";
export type RecursoVinculo = "frota" | "terceiro";

export interface Veiculo {
  id: string;
  nome: string;
  placa: string;
  tipo: VeiculoTipo;
  vinculo: RecursoVinculo;
  chassi?: string | null;
  ano_modelo?: string | null;
  renavam?: string | null;
  crlv_vencimento?: string | null;
  ipva_vencimento?: string | null;
  quitado: boolean;
  financiado: boolean;
  parcelas_restantes?: number | null;
  dia_vencimento_parcela?: number | null;
}

export interface VeiculoCampoCustom {
  id?: string;
  nome_opcao: string;
  valor: string;
}

export interface Motorista {
  id: string;
  nome_completo: string;
  cpf: string;
  vinculo: RecursoVinculo;
  data_nascimento?: string | null;
  cnh_numero?: string | null;
  cnh_categoria?: string | null;
  cnh_expedicao?: string | null;
  cnh_vencimento?: string | null;
  telefone?: string | null;
  contato_emergencia?: string | null;
  toxicologico_data?: string | null;
  toxicologico_vencimento?: string | null;
}

export type ViagemStatus =
  | "EM ANDAMENTO"
  | "EM CARREGAMENTO"
  | "EM ROTA"
  | "AGUARDANDO DESCARGA"
  | "DESCARREGANDO"
  | "EM ATRASO"
  | "FINALIZADO"
  | "PAGAMENTO PENDENTE"
  | "ARQUIVADO"
  | "CHEGOU AO DESTINO DE ENTREGA"
  | "CHEGOU AO DESTINO FINAL"
  | "PARADO NA ESTRADA";

export type ViagemTipoTrajeto = "ida" | "volta" | "ida_volta";
export type ViagemRecursoTipo =
  | "abastecimento"
  | "manutencao"
  | "reembolso"
  | "pedagio"
  | "arla"
  | "outro";

export interface Viagem {
  id: string;
  motorista_id: string;
  veiculo_id: string;
  saida_em: string;
  chegada_prevista_em: string;
  local_saida: string;
  tipo_trajeto: ViagemTipoTrajeto;
  peso_kg?: number | null;
  valor_mercadoria?: number | null;
  valor_frete?: number | null;
  numero_cte?: string | null;
  descricao_mercadoria?: string | null;
  km_total?: number | null;
  status: ViagemStatus;
  entrega_atual_ordem?: number | null;
  motorista_apto: boolean;
  veiculo_apto: boolean;
  motoristas?: Pick<Motorista, "nome_completo" | "cpf" | "telefone"> & Partial<Motorista>;
  veiculos?: Pick<Veiculo, "nome" | "placa"> & Partial<Veiculo>;
}

export interface ViagemEntrega {
  id?: string;
  local_entrega: string;
  ordem: number;
}

export interface EnderecoEntidade {
  tipo_pessoa: TipoPessoa;
  nome: string;
  documento?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  local_proximo?: string | null;
  complemento?: string | null;
  telefone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_link?: string | null;
  observacoes?: string | null;
}
