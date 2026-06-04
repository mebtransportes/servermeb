import { createClient } from "@/lib/supabase/client";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { calcularComissionamento } from "@/types/fechamento";

type RecursoRow = {
  tipo: string;
  valor: number;
  litros?: number | null;
};

function somarRecursos(recursos: RecursoRow[]) {
  let abastecimento_litros = 0;
  let abastecimento_valor = 0;
  let arla_valor = 0;
  let manutencao_total = 0;
  let pedagio_valor = 0;
  let reembolso_valor = 0;

  for (const r of recursos) {
    const v = Number(r.valor) || 0;
    switch (r.tipo) {
      case "abastecimento":
        abastecimento_valor += v;
        abastecimento_litros += Number(r.litros) || 0;
        break;
      case "arla":
        arla_valor += v;
        break;
      case "manutencao":
        manutencao_total += v;
        break;
      case "pedagio":
        pedagio_valor += v;
        break;
      case "reembolso":
        reembolso_valor += v;
        break;
    }
  }

  return {
    abastecimento_litros,
    abastecimento_valor,
    arla_valor,
    manutencao_total,
    pedagio_valor,
    reembolso_valor,
  };
}

/** Recalcula e grava fechamento quando a viagem está FINALIZADA. */
export async function syncFechamentoViagem(viagemId: string): Promise<string | null> {
  const supabase = createClient();

  const { data: fechamentoExistente } = await supabase
    .from("viagem_fechamentos")
    .select("icms_percent, comissao_tipo, comissao_percent")
    .eq("viagem_id", viagemId)
    .maybeSingle();

  const { data: viagem, error: errV } = await supabase
    .from("viagens")
    .select(
      `
      id, status, motorista_id, saida_em, local_saida, km_total,
      valor_frete, numero_cte,
      motoristas ( nome_completo ),
      veiculos ( nome, placa ),
      viagem_veiculos ( ordem, veiculos ( nome, placa ) )
    `
    )
    .eq("id", viagemId)
    .single();

  if (errV || !viagem) return errV?.message ?? "Viagem não encontrada";
  if (viagem.status !== "FINALIZADO") return null;

  const motoristaRaw = viagem.motoristas as
    | { nome_completo: string }
    | { nome_completo: string }[]
    | null;
  const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;

  const vv = viagem.viagem_veiculos as
    | { ordem: number; veiculos: { nome: string; placa: string } | { nome: string; placa: string }[] }[]
    | null;
  const veiculosViagem = (vv ?? [])
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => {
      const v = item.veiculos;
      return Array.isArray(v) ? v[0] : v;
    })
    .filter((v): v is { nome: string; placa: string } => !!v);
  const veiculoRaw = viagem.veiculos as
    | { nome: string; placa: string }
    | { nome: string; placa: string }[]
    | null;
  const veiculoFallback = Array.isArray(veiculoRaw) ? veiculoRaw[0] : veiculoRaw;
  const listaVeiculos =
    veiculosViagem.length > 0
      ? veiculosViagem
      : veiculoFallback
        ? [veiculoFallback]
        : [];

  const { data: entregas } = await supabase
    .from("viagem_entregas")
    .select("local_entrega, ordem")
    .eq("viagem_id", viagemId)
    .order("ordem");

  const { data: recursos } = await supabase
    .from("viagem_recursos")
    .select("tipo, valor, litros")
    .eq("viagem_id", viagemId);

  const gastos = somarRecursos((recursos as RecursoRow[]) ?? []);
  const valorFrete = Number(viagem.valor_frete) || 0;

  const icmsPercent = Number(fechamentoExistente?.icms_percent);
  const comissaoPercent = Number(fechamentoExistente?.comissao_percent);
  const comissaoTipo = (fechamentoExistente?.comissao_tipo ??
    "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL";

  const { frete_liquido: freteLiquido, comissao_final: comissaoFinal } =
    calcularComissionamento({
      valorFrete,
      icmsPercent,
      comissaoPercent,
      comissaoTipo,
      reembolso: gastos.reembolso_valor,
    });
  const destino =
    (entregas ?? []).map((e) => e.local_entrega).filter(Boolean).join(" · ") || null;

  const payload = {
    viagem_id: viagemId,
    motorista_id: viagem.motorista_id,
    motorista_nome: motorista?.nome_completo ?? "—",
    data_embarque: viagem.saida_em,
    local_embarque: viagem.local_saida,
    veiculo_label: formatarVeiculosLabel(listaVeiculos),
    numero_cte: viagem.numero_cte ?? null,
    destino,
    km_total: viagem.km_total != null ? Number(viagem.km_total) : null,
    ...gastos,
    valor_frete: valorFrete,
    frete_liquido: freteLiquido,
    comissao_final: comissaoFinal,
    icms_percent: Number.isFinite(icmsPercent) ? icmsPercent : 12,
    comissao_tipo: comissaoTipo,
    comissao_percent: Number.isFinite(comissaoPercent) ? comissaoPercent : 12,
  };

  const { error } = await supabase
    .from("viagem_fechamentos")
    .upsert(payload, { onConflict: "viagem_id" });

  return error?.message ?? null;
}
