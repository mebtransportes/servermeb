import { createClient } from "@/lib/supabase/client";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { fetchLitrosTotaisVeiculo } from "@/lib/litros-frota-veiculo";
import { calcularKmRodado, syncQuilometragemViagem } from "@/lib/veiculo-km";
import { resolverDataPagamentoTerceiro } from "@/lib/viagem-pagamento-terceiro";
import type { ViagemFechamento } from "@/types/fechamento";
import {
  calcularComissionamento,
  calcularConsumoKmLitro,
  paramsComissionamentoFechamento,
} from "@/types/fechamento";
import { statusGeraFechamento } from "@/lib/viagem-status";
import { isFrota } from "@/lib/viagem-validation";
import {
  isArlaCombustivel,
  litrosAbastecimentoParaConsumo,
} from "@/lib/combustivel-consumo";
import type { RecursoVinculo } from "@/types";

type RecursoRow = {
  tipo: string;
  valor: number;
  litros?: number | null;
  abastecimento_inicial?: boolean;
  combustivel_tipo?: string | null;
  desconta_motorista?: boolean | null;
  km_abastecimento?: number | null;
  realizado_em?: string | null;
  teve_desconto_combustivel?: boolean | null;
  valor_desconto_combustivel?: number | null;
};

function somarRecursos(recursos: RecursoRow[]) {
  let litros_abastecimento_viagem = 0;
  let abastecimento_valor = 0;
  let abastecimento_desconto_total = 0;
  let arla_valor = 0;
  let manutencao_total = 0;
  let pedagio_valor = 0;
  let estacionamento_valor = 0;
  let descarga_valor = 0;
  let pedagio_desconta_motorista = 0;
  let outros_valor = 0;
  let outros_desconta_motorista = 0;
  let seguro_valor = 0;
  let monitoramento_valor = 0;
  let reembolso_valor = 0;
  let adiantamento_valor = 0;
  let km_final_abastecimento: number | null = null;
  let km_final_abastecimento_em: string | null = null;

  for (const r of recursos) {
    const v = Number(r.valor) || 0;
    switch (r.tipo) {
      case "abastecimento":
        if (isArlaCombustivel(r.combustivel_tipo)) {
          arla_valor += v;
        } else {
          abastecimento_valor += v;
          if (Number(r.valor_desconto_combustivel) > 0) {
            abastecimento_desconto_total += Number(r.valor_desconto_combustivel) || 0;
          }
          if (!r.abastecimento_inicial) {
            litros_abastecimento_viagem += litrosAbastecimentoParaConsumo(r);
          }
          const kmAb = Number(r.km_abastecimento);
          const realizadoEm = r.realizado_em;
          if (Number.isFinite(kmAb) && kmAb > 0 && realizadoEm) {
            if (
              !km_final_abastecimento_em ||
              realizadoEm > km_final_abastecimento_em
            ) {
              km_final_abastecimento = kmAb;
              km_final_abastecimento_em = realizadoEm;
            }
          }
        }
        break;
      case "arla":
        arla_valor += v;
        break;
      case "manutencao":
        manutencao_total += v;
        break;
      case "pedagio":
        pedagio_valor += v;
        if (r.desconta_motorista !== false) {
          pedagio_desconta_motorista += v;
        }
        break;
      case "estacionamento":
        estacionamento_valor += v;
        if (r.desconta_motorista !== false) {
          pedagio_desconta_motorista += v;
        }
        break;
      case "descarga":
        descarga_valor += v;
        if (r.desconta_motorista !== false) {
          pedagio_desconta_motorista += v;
        }
        break;
      case "outro":
        outros_valor += v;
        if (r.desconta_motorista === true) {
          outros_desconta_motorista += v;
        }
        break;
      case "seguro":
        seguro_valor += v;
        break;
      case "monitoramento":
        monitoramento_valor += v;
        break;
      case "reembolso":
        reembolso_valor += v;
        break;
      case "adiantamento":
        adiantamento_valor += v;
        break;
    }
  }

  return {
    litros_abastecimento_viagem,
    abastecimento_valor,
    abastecimento_desconto_total,
    arla_valor,
    manutencao_total,
    pedagio_valor,
    estacionamento_valor,
    descarga_valor,
    pedagio_desconta_motorista,
    km_final_abastecimento,
    outros_valor,
    outros_desconta_motorista,
    seguro_valor,
    monitoramento_valor,
    reembolso_valor,
    adiantamento_valor,
  };
}

/** Recalcula e grava fechamento quando a viagem está FINALIZADA. */
export async function syncFechamentoViagem(viagemId: string): Promise<string | null> {
  const kmErr = await syncQuilometragemViagem(viagemId);
  if (kmErr) return kmErr;

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
      id, status, motorista_id, veiculo_id, saida_em, chegada_prevista_em, local_saida, km_total,
      valor_frete, valor_mercadoria, data_pagamento_terceiro, data_pagamento, numero_cte,
      km_odometro_inicial, km_odometro_final,
      motoristas ( nome_completo, vinculo ),
      veiculos ( nome, placa ),
      viagem_veiculos ( ordem, veiculos ( nome, placa ) )
    `
    )
    .eq("id", viagemId)
    .single();

  if (errV || !viagem) return errV?.message ?? "Viagem não encontrada";
  if (!statusGeraFechamento(viagem.status)) return null;

  const motoristaRaw = viagem.motoristas as
    | { nome_completo: string; vinculo?: RecursoVinculo }
    | { nome_completo: string; vinculo?: RecursoVinculo }[]
    | null;
  const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;
  const motoristaTerceiro = motorista ? !isFrota(motorista.vinculo) : false;

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
    .select("tipo, valor, litros, abastecimento_inicial, combustivel_tipo, desconta_motorista, km_abastecimento, realizado_em, teve_desconto_combustivel, valor_desconto_combustivel")
    .eq("viagem_id", viagemId);

  const gastos = somarRecursos((recursos as RecursoRow[]) ?? []);
  const valorFrete = Number(viagem.valor_frete) || 0;

  const icmsPercent = Number(fechamentoExistente?.icms_percent);
  const comissaoPercent = Number(fechamentoExistente?.comissao_percent);
  const comissaoTipo = (fechamentoExistente?.comissao_tipo ??
    (motoristaTerceiro ? "LIQUIDO_TOTAL" : "PERCENTUAL")) as
    | "PERCENTUAL"
    | "LIQUIDO_TOTAL";
  const comissaoPercentEfetivo = Number.isFinite(comissaoPercent)
    ? comissaoPercent
    : motoristaTerceiro
      ? 100
      : 12;

  const gastosFechamento = {
    abastecimento_valor: gastos.abastecimento_valor,
    abastecimento_desconto_total: gastos.abastecimento_desconto_total,
    arla_valor: gastos.arla_valor,
    manutencao_total: gastos.manutencao_total,
    pedagio_valor: gastos.pedagio_valor,
    estacionamento_valor: gastos.estacionamento_valor,
    descarga_valor: gastos.descarga_valor,
    pedagio_desconta_motorista: gastos.pedagio_desconta_motorista,
    outros_valor: gastos.outros_valor,
    outros_desconta_motorista: gastos.outros_desconta_motorista,
    seguro_valor: gastos.seguro_valor,
    monitoramento_valor: gastos.monitoramento_valor,
    motorista_terceiro: motoristaTerceiro,
  } as ViagemFechamento;

  const { totalDespesasCalc, totalDespesasMotoristaCalc } =
    paramsComissionamentoFechamento(gastosFechamento);

  const { frete_liquido: freteLiquido, comissao_final: comissaoFinal, valor_icms } =
    calcularComissionamento({
      valorFrete,
      icmsPercent,
      comissaoPercent: comissaoPercentEfetivo,
      comissaoTipo: motoristaTerceiro ? "PERCENTUAL" : comissaoTipo,
      reembolso: gastos.reembolso_valor,
      adiantamento: gastos.adiantamento_valor,
      motoristaTerceiro,
      totalDespesas: totalDespesasCalc,
      totalDespesasMotorista: totalDespesasMotoristaCalc,
    });
  const valorCarga = Number(viagem.valor_mercadoria) || 0;
  const destino =
    (entregas ?? []).map((e) => e.local_entrega).filter(Boolean).join(" · ") || null;

  const veiculoId = viagem.veiculo_id as string;
  const tanqueFrota = await fetchLitrosTotaisVeiculo(veiculoId, viagem.saida_em);
  const litros_tanque_inicial = tanqueFrota?.litrosTotais ?? 0;
  const litros_abastecimento_viagem = gastos.litros_abastecimento_viagem;
  const abastecimento_litros = litros_tanque_inicial + litros_abastecimento_viagem;

  const kmOdometroInicial =
    viagem.km_odometro_inicial != null ? Number(viagem.km_odometro_inicial) : null;
  const kmOdometroFinal = gastos.km_final_abastecimento;
  const kmRodado = calcularKmRodado(kmOdometroInicial, kmOdometroFinal);
  const consumo_km_litro = calcularConsumoKmLitro(
    kmRodado,
    litros_abastecimento_viagem
  );

  const payload = {
    viagem_id: viagemId,
    motorista_id: viagem.motorista_id,
    motorista_nome: motorista?.nome_completo ?? "—",
    data_embarque: viagem.saida_em,
    chegada_em: viagem.chegada_prevista_em ?? null,
    local_embarque: viagem.local_saida,
    veiculo_label: formatarVeiculosLabel(listaVeiculos),
    numero_cte: viagem.numero_cte ?? null,
    destino,
    km_total: kmRodado,
    km_rodado: kmRodado,
    km_odometro_inicial: kmOdometroInicial,
    km_odometro_final: kmOdometroFinal,
    consumo_km_litro,
    litros_tanque_inicial,
    litros_abastecimento_viagem,
    abastecimento_litros,
    abastecimento_valor: gastos.abastecimento_valor,
    abastecimento_desconto_total: gastos.abastecimento_desconto_total,
    arla_valor: gastos.arla_valor,
    manutencao_total: gastos.manutencao_total,
    pedagio_valor: gastos.pedagio_valor,
    estacionamento_valor: gastos.estacionamento_valor,
    descarga_valor: gastos.descarga_valor,
    pedagio_desconta_motorista: gastos.pedagio_desconta_motorista,
    km_final_abastecimento: gastos.km_final_abastecimento,
    outros_valor: gastos.outros_valor,
    outros_desconta_motorista: gastos.outros_desconta_motorista,
    reembolso_valor: gastos.reembolso_valor,
    adiantamento_valor: gastos.adiantamento_valor,
    motorista_terceiro: motoristaTerceiro,
    data_pagamento: motoristaTerceiro ? resolverDataPagamentoTerceiro(viagem) : null,
    valor_carga: valorCarga,
    valor_icms,
    seguro_valor: gastos.seguro_valor,
    monitoramento_valor: gastos.monitoramento_valor,
    valor_frete: valorFrete,
    frete_liquido: freteLiquido,
    comissao_final: comissaoFinal,
    icms_percent: Number.isFinite(icmsPercent) ? icmsPercent : 12,
    comissao_tipo: comissaoTipo,
    comissao_percent: comissaoPercentEfetivo,
  };

  const { error } = await supabase
    .from("viagem_fechamentos")
    .upsert(payload, { onConflict: "viagem_id" });

  return error?.message ?? null;
}
