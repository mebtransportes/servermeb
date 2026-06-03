export type SegmentoEmpresarial = "escritorio" | "limpeza" | "contabilidade";

export type DespesaEmpresarial = {
  id: string;
  segmento: SegmentoEmpresarial;
  valor: number;
  quantidade: number;
  nome_item: string;
  onde_comprou: string;
  data_despesa: string;
  created_at?: string;
};

export const SEGMENTOS_EMPRESARIAIS: {
  value: SegmentoEmpresarial;
  label: string;
}[] = [
  { value: "escritorio", label: "Materiais de Escritório" },
  { value: "limpeza", label: "Materiais de Limpeza" },
  { value: "contabilidade", label: "Contabilidade e Sistemas" },
];
