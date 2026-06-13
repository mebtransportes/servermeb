"use client";

import { useEffect, useMemo, useState } from "react";
import type { ViagemFechamento } from "@/types/fechamento";
import {
  totalDespesasFechamento,
  calcularComissionamento,
  calcularConsumoKmLitro,
  getComissaoPercent,
  getIcmsPercent,
} from "@/types/fechamento";
import {
  fetchOutrosDespesasPorViagens,
  type FechamentoOutroDespesa,
} from "@/lib/fechamento-outros-despesas";
import {
  fetchAdiantamentosPorViagens,
  type FechamentoAdiantamento,
} from "@/lib/fechamento-adiantamentos";
import { FechamentoFrotaDetalhe } from "@/components/financeiro/fechamento-frota-detalhe";
import { FechamentoTerceiroDetalhe } from "@/components/financeiro/fechamento-terceiro-detalhe";

export function useFechamentoValores(
  f: ViagemFechamento,
  overrides?: {
    icmsPercent?: number;
    comissaoPercent?: number;
    comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL";
  }
) {
  const icms = overrides?.icmsPercent ?? getIcmsPercent(f);
  const comissaoTipo =
    overrides?.comissaoTipo ??
    ((f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL");
  const comissaoPercent = overrides?.comissaoPercent ?? getComissaoPercent(f);

  const litrosViagem = Number(f.litros_abastecimento_viagem) || 0;
  const kmRodado = f.km_rodado ?? f.km_total;
  const consumoKmLitro =
    f.consumo_km_litro ?? calcularConsumoKmLitro(kmRodado, litrosViagem);
  const despesas = totalDespesasFechamento(f);

  const valores = useMemo(() => {
    const calc = calcularComissionamento({
      valorFrete: Number(f.valor_frete) || 0,
      icmsPercent: icms,
      comissaoPercent,
      comissaoTipo,
      reembolso: Number(f.reembolso_valor) || 0,
      adiantamento: Number(f.adiantamento_valor) || 0,
      motoristaTerceiro: !!f.motorista_terceiro,
      totalDespesas: despesas,
    });
    return {
      icms,
      frete_liquido: calc.frete_liquido,
      frete_menos_gastos: calc.frete_menos_gastos,
      base_comissao: calc.base_comissao,
      total_comissao: calc.total_comissao,
      comissao_bruta: calc.comissao_bruta ?? calc.total_comissao,
      comissao_final: calc.comissao_final,
      valor_icms: calc.valor_icms,
    };
  }, [f, icms, comissaoPercent, comissaoTipo, despesas]);

  return {
    litrosViagem,
    kmRodado,
    consumoKmLitro,
    despesas,
    comissaoTipo,
    comissaoPercent,
    ...valores,
  };
}

export function FechamentoViagemDetalhe({
  f,
  icmsPercent,
  comissaoPercent,
  comissaoTipo,
  showHeader = true,
  showComissaoFinal = true,
  outrosDespesas,
  adiantamentos,
}: {
  f: ViagemFechamento;
  icmsPercent?: number;
  comissaoPercent?: number;
  comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL";
  showHeader?: boolean;
  showComissaoFinal?: boolean;
  outrosDespesas?: FechamentoOutroDespesa[];
  adiantamentos?: FechamentoAdiantamento[];
}) {
  const v = useFechamentoValores(f, { icmsPercent, comissaoPercent, comissaoTipo });
  const [localOutros, setLocalOutros] = useState<FechamentoOutroDespesa[]>([]);
  const [carregandoOutros, setCarregandoOutros] = useState(false);
  const [localAdiantamentos, setLocalAdiantamentos] = useState<FechamentoAdiantamento[]>([]);
  const [carregandoAdiantamentos, setCarregandoAdiantamentos] = useState(false);

  useEffect(() => {
    if (outrosDespesas !== undefined) return;
    if ((f.outros_valor ?? 0) <= 0) {
      setLocalOutros([]);
      return;
    }
    let ativo = true;
    setCarregandoOutros(true);
    fetchOutrosDespesasPorViagens([f.viagem_id]).then((map) => {
      if (!ativo) return;
      setLocalOutros(map.get(f.viagem_id) ?? []);
      setCarregandoOutros(false);
    });
    return () => {
      ativo = false;
    };
  }, [f.viagem_id, f.outros_valor, outrosDespesas]);

  useEffect(() => {
    if (adiantamentos !== undefined || f.motorista_terceiro) return;
    if ((f.adiantamento_valor ?? 0) <= 0) {
      setLocalAdiantamentos([]);
      return;
    }
    let ativo = true;
    setCarregandoAdiantamentos(true);
    fetchAdiantamentosPorViagens([f.viagem_id]).then((map) => {
      if (!ativo) return;
      setLocalAdiantamentos(map.get(f.viagem_id) ?? []);
      setCarregandoAdiantamentos(false);
    });
    return () => {
      ativo = false;
    };
  }, [f.viagem_id, f.adiantamento_valor, f.motorista_terceiro, adiantamentos]);

  const listaOutros = outrosDespesas ?? localOutros;
  const listaAdiantamentos = adiantamentos ?? localAdiantamentos;
  const carregando = carregandoOutros || carregandoAdiantamentos;

  return (
    <div>
      {showHeader && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              {f.motorista_terceiro ? "Fechamento terceiro" : "Fechamento frota"}
            </h3>
            <p className="text-xs text-slate-500">
              CTE {f.numero_cte ?? "—"} · {new Date(f.data_embarque).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <span
            className={
              f.motorista_terceiro
                ? "rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-cyan-800"
                : "rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800"
            }
          >
            {f.motorista_terceiro ? "Terceiro" : "Frota"}
          </span>
        </header>
      )}

      {carregando && outrosDespesas === undefined && (
        <p className="mb-2 text-xs text-slate-400">Carregando detalhes...</p>
      )}

      {f.motorista_terceiro ? (
        <FechamentoTerceiroDetalhe
          f={f}
          v={v}
          outrosDespesas={listaOutros}
          showComissaoFinal={showComissaoFinal}
        />
      ) : (
        <FechamentoFrotaDetalhe
          f={f}
          v={v}
          outrosDespesas={listaOutros}
          adiantamentos={listaAdiantamentos}
          showComissaoFinal={showComissaoFinal}
        />
      )}
    </div>
  );
}
