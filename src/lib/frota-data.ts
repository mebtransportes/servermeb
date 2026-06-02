import { createClient } from "@/lib/supabase/client";
import type { ManutencaoCard, AbastecimentoCard, FrotaManutencaoStatus } from "@/types/frota";

export async function fetchManutencoes(): Promise<ManutencaoCard[]> {
  const supabase = createClient();
  const cards: ManutencaoCard[] = [];

  const { data: preventivas } = await supabase
    .from("frota_manutencoes")
    .select("*, veiculos(nome, placa)")
    .order("data_agendada", { ascending: false });

  for (const m of preventivas ?? []) {
    const veic = m.veiculos as { nome: string; placa: string } | null;
    cards.push({
      id: `frota-${m.id}`,
      frotaId: m.id,
      source: "preventiva",
      nome: m.nome,
      descricao: m.descricao,
      onde: m.onde,
      dataRef: m.data_agendada,
      horaRef: m.hora_agendada,
      valor: Number(m.valor_total),
      status: m.status as FrotaManutencaoStatus,
      veiculoPlaca: veic ? `${veic.nome} — ${veic.placa}` : undefined,
      km: m.km_veiculo ? Number(m.km_veiculo) : null,
      nota_fiscal_path: m.nota_fiscal_path,
      comprovante_path: m.comprovante_path,
      nota_fiscal_nome: m.nota_fiscal_nome,
      comprovante_nome: m.comprovante_nome,
    });
  }

  const { data: viagemRec } = await supabase
    .from("viagem_recursos")
    .select(
      `
      id, valor, descricao, realizado_em, status_frota, oficina_id, km_veiculo,
      nota_fiscal_path, comprovante_path, nota_fiscal_nome, comprovante_nome,
      viagens (
        motoristas ( nome_completo ),
        veiculos ( placa, nome )
      ),
      oficinas ( nome )
    `
    )
    .eq("tipo", "manutencao")
    .order("realizado_em", { ascending: false });

  for (const r of viagemRec ?? []) {
    const v = r.viagens as {
      motoristas?: { nome_completo: string };
      veiculos?: { placa: string; nome: string };
    } | null;
    const oficinaRaw = r.oficinas as { nome: string } | { nome: string }[] | null;
    const oficina = Array.isArray(oficinaRaw) ? oficinaRaw[0] : oficinaRaw;
    const dt = new Date(r.realizado_em);

    cards.push({
      id: `viagem-${r.id}`,
      viagemRecursoId: r.id,
      source: "viagem",
      nome: r.descricao || oficina?.nome || "Manutenção em viagem",
      descricao: r.descricao,
      onde: oficina?.nome ?? "Registrado na viagem",
      dataRef: dt.toISOString().split("T")[0],
      horaRef: dt.toTimeString().slice(0, 8),
      valor: Number(r.valor),
      status: (r.status_frota as FrotaManutencaoStatus) ?? "FINALIZADO",
      motoristaNome: v?.motoristas?.nome_completo,
      veiculoPlaca: v?.veiculos ? `${v.veiculos.nome} (${v.veiculos.placa})` : undefined,
      km: r.km_veiculo ? Number(r.km_veiculo) : null,
      nota_fiscal_path: r.nota_fiscal_path,
      comprovante_path: r.comprovante_path,
      nota_fiscal_nome: r.nota_fiscal_nome,
      comprovante_nome: r.comprovante_nome,
    });
  }

  return cards;
}

export async function fetchAbastecimentos(): Promise<AbastecimentoCard[]> {
  const supabase = createClient();
  const cards: AbastecimentoCard[] = [];

  const { data: manuais } = await supabase
    .from("frota_abastecimentos")
    .select("*, postos(nome), veiculos(nome, placa)")
    .order("data_hora", { ascending: false });

  for (const a of manuais ?? []) {
    const posto = a.postos as { nome: string } | null;
    const veic = a.veiculos as { nome: string; placa: string } | null;
    cards.push({
      id: `frota-${a.id}`,
      frotaId: a.id,
      source: "manual",
      valor: Number(a.valor),
      km: a.km_abastecimento ? Number(a.km_abastecimento) : null,
      litros: a.litros ? Number(a.litros) : null,
      descricao: a.descricao,
      dataHora: a.data_hora,
      postoNome: posto?.nome,
      veiculoLabel: veic ? `${veic.nome} — ${veic.placa}` : undefined,
      nota_fiscal_path: a.nota_fiscal_path,
      comprovante_path: a.comprovante_path,
      nota_fiscal_nome: a.nota_fiscal_nome,
      comprovante_nome: a.comprovante_nome,
    });
  }

  const { data: viagemRec } = await supabase
    .from("viagem_recursos")
    .select(
      `
      id, valor, descricao, realizado_em, km_abastecimento, litros,
      nota_fiscal_path, comprovante_path, nota_fiscal_nome, comprovante_nome,
      postos ( nome ),
      viagens (
        motoristas ( nome_completo ),
        veiculos ( nome, placa )
      )
    `
    )
    .eq("tipo", "abastecimento")
    .order("realizado_em", { ascending: false });

  for (const r of viagemRec ?? []) {
    const v = r.viagens as {
      motoristas?: { nome_completo: string };
      veiculos?: { placa: string; nome: string };
    } | null;
    const postoRaw = r.postos as { nome: string } | { nome: string }[] | null;
    const posto = Array.isArray(postoRaw) ? postoRaw[0] : postoRaw;

    cards.push({
      id: `viagem-${r.id}`,
      viagemRecursoId: r.id,
      source: "viagem",
      valor: Number(r.valor),
      km: r.km_abastecimento ? Number(r.km_abastecimento) : null,
      litros: r.litros ? Number(r.litros) : null,
      descricao: r.descricao,
      dataHora: r.realizado_em,
      postoNome: posto?.nome,
      motoristaNome: v?.motoristas?.nome_completo,
      veiculoLabel: v?.veiculos ? `${v.veiculos.nome} — ${v.veiculos.placa}` : undefined,
      nota_fiscal_path: r.nota_fiscal_path,
      comprovante_path: r.comprovante_path,
      nota_fiscal_nome: r.nota_fiscal_nome,
      comprovante_nome: r.comprovante_nome,
    });
  }

  return cards.sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );
}
