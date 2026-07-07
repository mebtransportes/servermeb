import { createClient } from "@/lib/supabase/client";
import { partesValorAbastecimento } from "@/lib/abastecimento-valor";
import type { ManutencaoCard, AbastecimentoCard, FrotaManutencaoStatus } from "@/types/frota";

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function mapAbastecimentoViagem(
  r: {
    id: string;
    valor: number;
    descricao?: string | null;
    realizado_em: string;
    km_abastecimento?: number | null;
    litros?: number | null;
    valor_desconto_combustivel?: number | null;
    nota_fiscal_path?: string | null;
    comprovante_path?: string | null;
    nota_fiscal_nome?: string | null;
    comprovante_nome?: string | null;
    combustivel_tipo?: string | null;
    postos?: { nome: string } | { nome: string }[] | null;
    viagens?:
      | {
          motoristas?: { nome_completo: string } | { nome_completo: string }[] | null;
          veiculos?: { placa: string; nome: string } | { placa: string; nome: string }[] | null;
        }
      | {
          motoristas?: { nome_completo: string } | { nome_completo: string }[] | null;
          veiculos?: { placa: string; nome: string } | { placa: string; nome: string }[] | null;
        }[]
      | null;
  }
): AbastecimentoCard {
  const viagemRaw = relOne(r.viagens);
  const motorista = relOne(viagemRaw?.motoristas ?? null)?.nome_completo;
  const veiculoInfo = relOne(viagemRaw?.veiculos ?? null);
  const postoRaw = r.postos as { nome: string } | { nome: string }[] | null;
  const posto = Array.isArray(postoRaw) ? postoRaw[0] : postoRaw;
  const valorBruto = Number(r.valor) || 0;
  const partes = partesValorAbastecimento(valorBruto, r.valor_desconto_combustivel);
  const desconto = partes.desconto > 0 ? partes.desconto : undefined;

  return {
    id: `viagem-${r.id}`,
    viagemRecursoId: r.id,
    source: "viagem",
    valor: partes.valorLiquido,
    valorBruto: desconto ? partes.valorBruto : undefined,
    desconto,
    km: r.km_abastecimento ? Number(r.km_abastecimento) : null,
    litros: r.litros ? Number(r.litros) : null,
    descricao: r.descricao,
    dataHora: r.realizado_em,
    postoNome: posto?.nome,
    motoristaNome: motorista,
    veiculoLabel: veiculoInfo ? `${veiculoInfo.nome} — ${veiculoInfo.placa}` : undefined,
    veiculoPlaca: veiculoInfo?.placa,
    combustivelTipo: r.combustivel_tipo ?? null,
    nota_fiscal_path: r.nota_fiscal_path,
    comprovante_path: r.comprovante_path,
    nota_fiscal_nome: r.nota_fiscal_nome,
    comprovante_nome: r.comprovante_nome,
  };
}

export async function fetchManutencoes(): Promise<ManutencaoCard[]> {
  const supabase = createClient();
  const cards: ManutencaoCard[] = [];

  const { data: preventivas } = await supabase
    .from("frota_manutencoes")
    .select(
      "*, veiculos(nome, placa), frota_manutencao_parcelas(numero, valor, data_vencimento)"
    )
    .order("data_agendada", { ascending: false });

  for (const m of preventivas ?? []) {
    const veic = m.veiculos as { nome: string; placa: string } | null;
    const parcelasRaw = m.frota_manutencao_parcelas as
      | { numero: number; valor: number; data_vencimento: string }[]
      | null;
    const parcelas = (parcelasRaw ?? [])
      .slice()
      .sort((a, b) => a.numero - b.numero)
      .map((p) => ({
        numero: p.numero,
        valor: Number(p.valor) || 0,
        dataVencimento: p.data_vencimento,
      }));
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
      veiculoId: m.veiculo_id ?? null,
      veiculoPlaca: veic ? `${veic.nome} — ${veic.placa}` : undefined,
      km: m.km_veiculo ? Number(m.km_veiculo) : null,
      dataProximaManutencao: m.data_proxima_manutencao ?? null,
      nota_fiscal_path: m.nota_fiscal_path,
      comprovante_path: m.comprovante_path,
      nota_fiscal_nome: m.nota_fiscal_nome,
      comprovante_nome: m.comprovante_nome,
      pagamentoModalidade: m.pagamento_modalidade ?? null,
      pagamentoForma: m.pagamento_forma ?? null,
      pagamentoVencimento: m.pagamento_vencimento ?? null,
      parcelas,
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
      litrosTotais: a.litros_totais ? Number(a.litros_totais) : null,
      descricao: a.descricao,
      dataHora: a.data_hora,
      postoNome: posto?.nome,
      veiculoLabel: veic ? `${veic.nome} — ${veic.placa}` : undefined,
      veiculoPlaca: veic?.placa,
      combustivelTipo: a.combustivel_tipo ?? null,
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
      combustivel_tipo,
      valor_desconto_combustivel,
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
    cards.push(mapAbastecimentoViagem(r));
  }

  return cards.sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );
}
