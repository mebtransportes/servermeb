import { createClient } from "@/lib/supabase/client";
import { carregarParcelasManutencao } from "@/lib/frota-manutencao-pagamento";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { syncKmInicialViagensAgendadas } from "@/lib/veiculo-km";
import type {
  ManutencaoPagamentoForma,
  ManutencaoPagamentoModalidade,
  ManutencaoParcelaInput,
} from "@/lib/manutencao-pagamento";
import { kmToBrInput, rawNumberStringToBrInput } from "@/lib/number-format";
import type { AbastecimentoCard, ManutencaoCard } from "@/types/frota";

export async function excluirManutencao(item: ManutencaoCard): Promise<string | null> {
  const supabase = createClient();
  if (item.frotaId) {
    const { error } = await supabase.from("frota_manutencoes").delete().eq("id", item.frotaId);
    return error?.message ?? null;
  }
  if (item.viagemRecursoId) {
    const { error } = await supabase
      .from("viagem_recursos")
      .delete()
      .eq("id", item.viagemRecursoId);
    return error?.message ?? null;
  }
  return "Registro não encontrado";
}

export async function excluirAbastecimento(item: AbastecimentoCard): Promise<string | null> {
  const supabase = createClient();
  if (item.frotaId) {
    const { data: row } = await supabase
      .from("frota_abastecimentos")
      .select("veiculo_id")
      .eq("id", item.frotaId)
      .maybeSingle();
    const { error } = await supabase.from("frota_abastecimentos").delete().eq("id", item.frotaId);
    if (error) return error.message;
    if (row?.veiculo_id) {
      const kmErr = await syncKmInicialViagensAgendadas(row.veiculo_id);
      if (kmErr) return kmErr;
    }
    return null;
  }
  if (item.viagemRecursoId) {
    const { data: row } = await supabase
      .from("viagem_recursos")
      .select("viagem_id")
      .eq("id", item.viagemRecursoId)
      .maybeSingle();
    const { error } = await supabase
      .from("viagem_recursos")
      .delete()
      .eq("id", item.viagemRecursoId);
    if (error) return error.message;
    if (row?.viagem_id) {
      const syncErr = await syncFechamentoViagem(row.viagem_id);
      if (syncErr) return syncErr;
    }
    return null;
  }
  return "Registro não encontrado";
}

export type ManutencaoEdicao = {
  source: "preventiva" | "viagem";
  frotaId?: string;
  viagemRecursoId?: string;
  nome: string;
  descricao: string;
  onde: string;
  oficinaId: string;
  veiculoId: string;
  kmVeiculo: string;
  data: string;
  hora: string;
  valor: string;
  status: ManutencaoCard["status"];
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
  pagamentoModalidade: ManutencaoPagamentoModalidade | "";
  pagamentoForma: ManutencaoPagamentoForma | "";
  pagamentoVencimento: string;
  parcelas: ManutencaoParcelaInput[];
  dataProximaManutencao: string;
};

export async function carregarManutencaoEdicao(
  item: ManutencaoCard
): Promise<ManutencaoEdicao | null> {
  const supabase = createClient();

  if (item.frotaId) {
    const { data } = await supabase
      .from("frota_manutencoes")
      .select("*")
      .eq("id", item.frotaId)
      .single();
    if (!data) return null;
    const parcelasDb = await carregarParcelasManutencao(data.id);
    const parcelas: ManutencaoParcelaInput[] = parcelasDb.map((p) => ({
      numero: p.numero,
      valor: rawNumberStringToBrInput(String(p.valor), 2),
      dataVencimento: p.dataVencimento,
    }));
    return {
      source: "preventiva",
      frotaId: data.id,
      nome: data.nome,
      descricao: data.descricao ?? "",
      onde: data.onde,
      oficinaId: data.oficina_id ?? "",
      veiculoId: data.veiculo_id ?? "",
      kmVeiculo: kmToBrInput(data.km_veiculo),
      data: data.data_agendada,
      hora: data.hora_agendada?.slice(0, 5) ?? "",
      valor: String(data.valor_total),
      status: data.status,
      nota_fiscal_path: data.nota_fiscal_path,
      nota_fiscal_nome: data.nota_fiscal_nome,
      comprovante_path: data.comprovante_path,
      comprovante_nome: data.comprovante_nome,
      pagamentoModalidade: (data.pagamento_modalidade as ManutencaoPagamentoModalidade) ?? "",
      pagamentoForma: (data.pagamento_forma as ManutencaoPagamentoForma) ?? "",
      pagamentoVencimento: data.pagamento_vencimento ?? "",
      parcelas,
      dataProximaManutencao: data.data_proxima_manutencao ?? "",
    };
  }

  if (item.viagemRecursoId) {
    const { data } = await supabase
      .from("viagem_recursos")
      .select("*, oficinas(nome)")
      .eq("id", item.viagemRecursoId)
      .single();
    if (!data) return null;
    const dt = new Date(data.realizado_em);
    const oficina = data.oficinas as { nome: string } | { nome: string }[] | null;
    const oficinaNome = Array.isArray(oficina) ? oficina[0]?.nome : oficina?.nome;
    return {
      source: "viagem",
      viagemRecursoId: data.id,
      nome: data.descricao || oficinaNome || "Manutenção",
      descricao: data.descricao ?? "",
      onde: oficinaNome ?? "",
      oficinaId: data.oficina_id ?? "",
      veiculoId: "",
      kmVeiculo: kmToBrInput(data.km_veiculo),
      data: dt.toISOString().split("T")[0],
      hora: dt.toTimeString().slice(0, 5),
      valor: String(data.valor),
      status: data.status_frota ?? "FINALIZADO",
      nota_fiscal_path: data.nota_fiscal_path,
      nota_fiscal_nome: data.nota_fiscal_nome,
      comprovante_path: data.comprovante_path,
      comprovante_nome: data.comprovante_nome,
      pagamentoModalidade: "",
      pagamentoForma: "",
      pagamentoVencimento: "",
      parcelas: [],
      dataProximaManutencao: "",
    };
  }

  return null;
}

export type AbastecimentoEdicao = {
  source: "manual" | "viagem";
  frotaId?: string;
  viagemRecursoId?: string;
  viagemId?: string;
  veiculoId: string;
  postoId: string;
  km: string;
  litros: string;
  litrosTotais: string;
  valor: string;
  teveDescontoCombustivel?: boolean;
  valorDescontoCombustivel?: string;
  descricao: string;
  dataHora: string;
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
};

export async function carregarAbastecimentoEdicao(
  item: AbastecimentoCard
): Promise<AbastecimentoEdicao | null> {
  const supabase = createClient();

  if (item.frotaId) {
    const { data } = await supabase
      .from("frota_abastecimentos")
      .select("*")
      .eq("id", item.frotaId)
      .single();
    if (!data) return null;
    const dt = new Date(data.data_hora);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    return {
      source: "manual",
      frotaId: data.id,
      veiculoId: data.veiculo_id ?? "",
      postoId: data.posto_id ?? "",
      km: kmToBrInput(data.km_abastecimento),
      litros: data.litros?.toString() ?? "",
      litrosTotais: data.litros_totais?.toString() ?? "",
      valor: String(data.valor),
      descricao: data.descricao ?? "",
      dataHora: local,
      nota_fiscal_path: data.nota_fiscal_path,
      nota_fiscal_nome: data.nota_fiscal_nome,
      comprovante_path: data.comprovante_path,
      comprovante_nome: data.comprovante_nome,
    };
  }

  if (item.viagemRecursoId) {
    const { data } = await supabase
      .from("viagem_recursos")
      .select("*, viagens(veiculo_id, id)")
      .eq("id", item.viagemRecursoId)
      .single();
    if (!data) return null;
    const dt = new Date(data.realizado_em);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    const viagemRaw = data.viagens as { veiculo_id?: string; id?: string } | null;
    const descontoVal = Number(data.valor_desconto_combustivel) || 0;
    return {
      source: "viagem",
      viagemRecursoId: data.id,
      viagemId: viagemRaw?.id,
      veiculoId: viagemRaw?.veiculo_id ?? "",
      postoId: data.posto_id ?? "",
      km: kmToBrInput(data.km_abastecimento),
      litros: data.litros?.toString() ?? "",
      litrosTotais: "",
      valor: String(data.valor),
      teveDescontoCombustivel: descontoVal > 0 || !!data.teve_desconto_combustivel,
      valorDescontoCombustivel:
        descontoVal > 0 ? String(data.valor_desconto_combustivel) : "",
      descricao: data.descricao ?? "",
      dataHora: local,
      nota_fiscal_path: data.nota_fiscal_path,
      nota_fiscal_nome: data.nota_fiscal_nome,
      comprovante_path: data.comprovante_path,
      comprovante_nome: data.comprovante_nome,
    };
  }

  return null;
}
