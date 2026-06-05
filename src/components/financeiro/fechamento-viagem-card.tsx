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
import { Select } from "@/components/ui/select";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { parseBrNumber } from "@/lib/number-format";
import { atualizarFechamentoConfig } from "@/lib/fechamento-data";
import { cn } from "@/lib/utils";

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-1 border-b border-slate-800/80 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

export function FechamentoViagemCard({
  f,
  onUpdated,
}: {
  f: ViagemFechamento;
  onUpdated: (atualizado: ViagemFechamento) => void;
}) {
  const despesas = totalDespesasFechamento(f);
  const litrosTanque = Number(f.litros_tanque_inicial) || 0;
  const litrosViagem = Number(f.litros_abastecimento_viagem) || 0;
  const litrosTotal =
    litrosTanque + litrosViagem > 0
      ? litrosTanque + litrosViagem
      : f.abastecimento_litros;
  const consumoKmLitro =
    f.consumo_km_litro ?? calcularConsumoKmLitro(f.km_total, litrosTotal);

  const [icmsPercent, setIcmsPercent] = useState(String(getIcmsPercent(f)));
  const [comissaoTipo, setComissaoTipo] = useState<"PERCENTUAL" | "LIQUIDO_TOTAL">(
    (f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL"
  );
  const [comissaoPercent, setComissaoPercent] = useState(String(getComissaoPercent(f)));
  const [saving, setSaving] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState(false);

  useEffect(() => {
    setIcmsPercent(String(getIcmsPercent(f)));
    setComissaoTipo((f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL");
    setComissaoPercent(String(getComissaoPercent(f)));
  }, [f]);

  const valores = useMemo(() => {
    const icms = parseBrNumber(icmsPercent) ?? getIcmsPercent(f);
    const comPerc = parseBrNumber(comissaoPercent) ?? getComissaoPercent(f);
    const { frete_liquido, total_comissao, comissao_final } = calcularComissionamento({
      valorFrete: Number(f.valor_frete) || 0,
      icmsPercent: icms,
      comissaoPercent: comPerc,
      comissaoTipo,
      reembolso: Number(f.reembolso_valor) || 0,
    });
    return { icms, frete_liquido, total_comissao, comissao_final };
  }, [f, icmsPercent, comissaoPercent, comissaoTipo]);

  async function handleSalvar() {
    setSaving(true);
    setSalvoMsg(false);
    const result = await atualizarFechamentoConfig({
      id: f.id,
      valorFrete: Number(f.valor_frete) || 0,
      reembolso: Number(f.reembolso_valor) || 0,
      icmsPercent: valores.icms,
      comissaoTipo,
      comissaoPercent: parseBrNumber(comissaoPercent) ?? getComissaoPercent(f),
    });
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.data) {
      onUpdated(result.data);
      setSalvoMsg(true);
      setTimeout(() => setSalvoMsg(false), 2500);
    }
  }

  return (
    <article className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <header className="mb-3 border-b border-slate-700/50 pb-3">
        <h3 className="font-semibold text-white">{f.motorista_nome}</h3>
        <p className="text-xs text-slate-400">
          Embarque: {new Date(f.data_embarque).toLocaleString("pt-BR")}
        </p>
      </header>

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
          litrosTanque > 0
            ? litrosTanque.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"
            : "—"
        }
      />
      <Linha
        label="Litros na viagem"
        value={
          litrosViagem > 0
            ? litrosViagem.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"
            : "—"
        }
      />
      <Linha
        label="Total litros"
        value={litrosTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " L"}
      />
      <Linha
        label="Consumo médio (km/L)"
        value={formatConsumoKmLitro(consumoKmLitro)}
      />
      <Linha label="Abastecimento (valor)" value={formatarMoeda(f.abastecimento_valor)} />
      <Linha label="Arla" value={formatarMoeda(f.arla_valor)} />
      <Linha label="Manutenção total" value={formatarMoeda(f.manutencao_total)} />
      <Linha label="Pedágio" value={formatarMoeda(f.pedagio_valor)} />
      <Linha label="Total gastos" value={formatarMoeda(despesas)} />

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-violet-400">
        Reembolso ao motorista
      </p>
      <Linha label="Valor a reembolsar" value={formatarMoeda(f.reembolso_valor)} />

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-500">
        Comissionamento
      </p>
      <Linha label="Valor do frete" value={formatarMoeda(f.valor_frete)} />
      <Linha
        label={`Frete líquido (frete − ICMS ${valores.icms}%)`}
        value={formatarMoeda(valores.frete_liquido)}
      />
      <Linha
        label={
          comissaoTipo === "LIQUIDO_TOTAL"
            ? "Comissão (frete líquido total)"
            : `Comissão (${comissaoPercent}% do líquido)`
        }
        value={formatarMoeda(valores.total_comissao)}
      />

      <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/30 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Configuração (admin)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <BrNumberInput
            label="ICMS (%)"
            decimalPlaces={2}
            value={icmsPercent}
            onChange={setIcmsPercent}
          />
          <Select
            label="Comissão"
            value={comissaoTipo}
            onChange={(e) => setComissaoTipo(e.target.value as "PERCENTUAL" | "LIQUIDO_TOTAL")}
            options={[
              { value: "PERCENTUAL", label: "Percentual do frete líquido" },
              { value: "LIQUIDO_TOTAL", label: "Frete líquido total" },
            ]}
          />
          <BrNumberInput
            label="Percentual (%)"
            decimalPlaces={2}
            value={comissaoPercent}
            onChange={setComissaoPercent}
            disabled={comissaoTipo === "LIQUIDO_TOTAL"}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Os valores acima atualizam ao editar. Salve para gravar no banco.
          </p>
          <div className="flex items-center gap-2">
            {salvoMsg && (
              <span className="text-xs font-medium text-emerald-400">Salvo!</span>
            )}
            <Button type="button" disabled={saving} onClick={handleSalvar}>
              {saving ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-emerald-950/40 px-3 py-2 text-center">
        <p className="text-xs text-emerald-400/80">Comissão final (comissão + reembolso)</p>
        <p className={cn("text-xl font-bold text-emerald-400")}>
          {formatarMoeda(valores.comissao_final)}
        </p>
      </div>
    </article>
  );
}
