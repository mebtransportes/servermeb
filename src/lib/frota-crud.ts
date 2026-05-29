import { createClient } from "@/lib/supabase/client";
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
    const { error } = await supabase.from("frota_abastecimentos").delete().eq("id", item.frotaId);
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
    return {
      source: "preventiva",
      frotaId: data.id,
      nome: data.nome,
      descricao: data.descricao ?? "",
      onde: data.onde,
      oficinaId: data.oficina_id ?? "",
      veiculoId: data.veiculo_id ?? "",
      kmVeiculo: data.km_veiculo?.toString() ?? "",
      data: data.data_agendada,
      hora: data.hora_agendada?.slice(0, 5) ?? "",
      valor: String(data.valor_total),
      status: data.status,
      nota_fiscal_path: data.nota_fiscal_path,
      nota_fiscal_nome: data.nota_fiscal_nome,
      comprovante_path: data.comprovante_path,
      comprovante_nome: data.comprovante_nome,
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
      kmVeiculo: data.km_veiculo?.toString() ?? "",
      data: dt.toISOString().split("T")[0],
      hora: dt.toTimeString().slice(0, 5),
      valor: String(data.valor),
      status: data.status_frota ?? "FINALIZADO",
      nota_fiscal_path: data.nota_fiscal_path,
      nota_fiscal_nome: data.nota_fiscal_nome,
      comprovante_path: data.comprovante_path,
      comprovante_nome: data.comprovante_nome,
    };
  }

  return null;
}

export type AbastecimentoEdicao = {
  source: "manual" | "viagem";
  frotaId?: string;
  viagemRecursoId?: string;
  veiculoId: string;
  postoId: string;
  km: string;
  litros: string;
  valor: string;
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
      km: data.km_abastecimento?.toString() ?? "",
      litros: data.litros?.toString() ?? "",
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
      .select("*, viagens(veiculo_id)")
      .eq("id", item.viagemRecursoId)
      .single();
    if (!data) return null;
    const dt = new Date(data.realizado_em);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    const viagem = data.viagens as { veiculo_id?: string } | null;
    return {
      source: "viagem",
      viagemRecursoId: data.id,
      veiculoId: viagem?.veiculo_id ?? "",
      postoId: data.posto_id ?? "",
      km: data.km_abastecimento?.toString() ?? "",
      litros: "",
      valor: String(data.valor),
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
