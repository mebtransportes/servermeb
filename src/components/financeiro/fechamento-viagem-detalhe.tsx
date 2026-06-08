"use client";

import type { ViagemFechamento } from "@/types/fechamento";
import {
  totalDespesasFechamento,
  calcularComissionamento,
  calcularConsumoKmLitro,
  formatConsumoKmLitro,
  getComissaoPercent,
  getIcmsPercent,
} from "@/types/fechamento";
import { formatarMoeda } from "@/lib/frota-filters";
import { useMemo } from "react";

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-1 border-b border-slate-800/80 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

export function useFechamentoValores(
  f: ViagemFechamento,
  overrides?: {
    icmsPercent?: number;
    comissaoPercent?: number;
    comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL";
  }
) {
  const icms = overrides?.icmsPercent ?? getIcmsPercent(f);
  const comissaoTipo = overrides?.comissaoTipo ?? ((f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL");
  const comissaoPercent = overrides?.comissaoPercent ?? getComissaoPercent(f);

  const litrosTanque = Number(f.litros_tanque_inicial) || 0;
  const litrosViagem = Number(f.litros_abastecimento_viagem) || 0;
  const litrosTotal =
    litrosTanque + litrosViagem > 0
      ? litrosTanque + litrosViagem
      : f.abastecimento_litros;
  const consumoKmLitro =
    f.consumo_km_litro ?? calcularConsumoKmLitro(f.km_total, litrosTotal);
  const despesas = totalDespesasFechamento(f);

  const valores = useMemo(() => {
    const { frete_liquido, total_comissao, comissao_final, valor_icms } =
      calcularComissionamento({
        valorFrete: Number(f.valor_frete) || 0,
        icmsPercent: icms,
        comissaoPercent,
        comissaoTipo,
        reembolso: Number(f.reembolso_valor) || 0,
        motoristaTerceiro: !!f.motorista_terceiro,
        seguroValor: f.seguro_valor,
        monitoramentoValor: f.monitoramento_valor,
      });
    return { icms, frete_liquido, total_comissao, comissao_final, valor_icms };
  }, [f, icms, comissaoPercent, comissaoTipo]);

  return {
    litrosTanque,
    litrosViagem,
    litrosTotal,
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
}: {
  f: ViagemFechamento;
  icmsPercent?: number;
  comissaoPercent?: number;
  comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL";
  showHeader?: boolean;
  showComissaoFinal?: boolean;
}) {
  const v = useFechamentoValores(f, { icmsPercent, comissaoPercent, comissaoTipo });

  return (
    <div>
      {showHeader && (
        <header className="mb-3 border-b border-slate-700/50 pb-3">
          <h3 className="font-semibold text-white">{f.motorista_nome}</h3>
          <p className="text-xs text-slate-400">
            Embarque: {new Date(f.data_embarque).toLocaleString("pt-BR")}
          </p>
        </header>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-500">
        Dados gerais
      </p>
      <Linha label="Local do embarque" value={f.local_embarque} />
      <Linha label="Veículo" value={f.veiculo_label} />
      <Linha label="CTE" value={f.numero_cte ?? "—"} />
      <Linha label="Destino" value={f.destino ?? "—"} />
      <Linha
        label="KM total"
        value={f.km_total != null ? f.km_total.toLocaleString("pt-BR") : "—"}
      />

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-amber-500">
        Gastos
      </p>
      <Linha
        label="Litros no tanque (frota)"
        value={
          v.litrosTanque > 0
            ? v.litrosTanque.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"
            : "—"
        }
      />
      <Linha
        label="Litros na viagem"
        value={
          v.litrosViagem > 0
            ? v.litrosViagem.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"
            : "—"
        }
      />
      <Linha
        label="Total litros"
        value={v.litrosTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"}
      />
      <Linha label="Consumo médio (km/L)" value={formatConsumoKmLitro(v.consumoKmLitro)} />
      <Linha label="Abastecimento (valor)" value={formatarMoeda(f.abastecimento_valor)} />
      <Linha label="Arla" value={formatarMoeda(f.arla_valor)} />
      <Linha label="Manutenção total" value={formatarMoeda(f.manutencao_total)} />
      <Linha label="Pedágio / estacionamento" value={formatarMoeda(f.pedagio_valor)} />
      {!f.motorista_terceiro && (f.seguro_valor ?? 0) > 0 && (
        <Linha label="Seguro" value={formatarMoeda(f.seguro_valor ?? 0)} />
      )}
      {!f.motorista_terceiro && (f.monitoramento_valor ?? 0) > 0 && (
        <Linha label="Monitoramento" value={formatarMoeda(f.monitoramento_valor ?? 0)} />
      )}
      <Linha label="Total gastos" value={formatarMoeda(v.despesas)} />

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-violet-400">
        Reembolso ao motorista
      </p>
      <Linha label="Valor a reembolsar" value={formatarMoeda(f.reembolso_valor)} />

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-500">
        Comissionamento
        {f.motorista_terceiro && (
          <span className="ml-2 font-normal normal-case text-amber-400/90">
            (motorista terceiro)
          </span>
        )}
      </p>
      {f.motorista_terceiro && (
        <Linha label="Valor da carga" value={formatarMoeda(f.valor_carga ?? 0)} />
      )}
      <Linha label="Frete bruto" value={formatarMoeda(f.valor_frete)} />
      <Linha
        label={`ICMS (${v.icms}%)`}
        value={formatarMoeda(v.valor_icms)}
      />
      {f.motorista_terceiro && (
        <>
          <Linha
            label="Seguro (0,09% da carga)"
            value={formatarMoeda(f.seguro_valor ?? 0)}
          />
          <Linha
            label="Monitoramento"
            value={formatarMoeda(f.monitoramento_valor ?? 0)}
          />
        </>
      )}
      <Linha
        label={
          f.motorista_terceiro
            ? "Frete líquido (bruto − ICMS − seguro − monitoramento)"
            : `Frete líquido (frete − ICMS ${v.icms}%)`
        }
        value={formatarMoeda(v.frete_liquido)}
      />
      <Linha
        label={
          v.comissaoTipo === "LIQUIDO_TOTAL"
            ? "Comissão (frete líquido total)"
            : `Comissão (${v.comissaoPercent}% do líquido)`
        }
        value={formatarMoeda(v.total_comissao)}
      />
      {showComissaoFinal && (
        <div className="mt-2 rounded-lg bg-emerald-950/40 px-3 py-2 text-center">
          <p className="text-xs text-emerald-400/80">Comissão final (comissão + reembolso)</p>
          <p className="text-lg font-bold text-emerald-400">{formatarMoeda(v.comissao_final)}</p>
        </div>
      )}
    </div>
  );
}
