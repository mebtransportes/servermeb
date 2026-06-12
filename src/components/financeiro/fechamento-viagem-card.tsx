"use client";

import type { ViagemFechamento } from "@/types/fechamento";
import { getComissaoPercent, getIcmsPercent } from "@/types/fechamento";
import { formatarMoeda } from "@/lib/frota-filters";
import { Select } from "@/components/ui/select";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { Button } from "@/components/ui/button";
import {
  FechamentoViagemDetalhe,
  useFechamentoValores,
} from "@/components/financeiro/fechamento-viagem-detalhe";
import { useEffect, useState } from "react";
import { parseBrNumber } from "@/lib/number-format";
import { atualizarFechamentoConfig } from "@/lib/fechamento-data";
import { cn, mebCard, mebFormSubsection } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";

export function FechamentoViagemCard({
  f,
  onUpdated,
}: {
  f: ViagemFechamento;
  onUpdated: (atualizado: ViagemFechamento) => void;
}) {
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

  const icms = parseBrNumber(icmsPercent) ?? getIcmsPercent(f);
  const comPerc = parseBrNumber(comissaoPercent) ?? getComissaoPercent(f);

  const preview = useFechamentoValores(f, {
    icmsPercent: icms,
    comissaoPercent: comPerc,
    comissaoTipo,
  });

  async function handleSalvar() {
    setSaving(true);
    setSalvoMsg(false);
    const result = await atualizarFechamentoConfig({
      id: f.id,
      valorFrete: Number(f.valor_frete) || 0,
      reembolso: Number(f.reembolso_valor) || 0,
      icmsPercent: icms,
      comissaoTipo,
      comissaoPercent: comPerc,
      motoristaTerceiro: !!f.motorista_terceiro,
      seguroValor: f.seguro_valor,
      monitoramentoValor: f.monitoramento_valor,
      pedagioDescontaMotorista: f.pedagio_desconta_motorista,
    });
    setSaving(false);
    if (result.error) {
      await mebAlert(result.error);
      return;
    }
    if (result.data) {
      onUpdated(result.data);
      setSalvoMsg(true);
      setTimeout(() => setSalvoMsg(false), 2500);
    }
  }

  return (
    <article className={cn(mebCard, "p-4")}>
      <FechamentoViagemDetalhe
        f={f}
        icmsPercent={icms}
        comissaoPercent={comPerc}
        comissaoTipo={comissaoTipo}
        showHeader
        showComissaoFinal={false}
      />

      <div className={cn(mebFormSubsection, "mt-3")}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
              <span className="text-xs font-medium text-emerald-700">Salvo!</span>
            )}
            <Button type="button" variant="success" disabled={saving} onClick={handleSalvar}>
              {saving ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center">
        <p className="text-xs text-slate-600">Comissão final (comissão + reembolso)</p>
        <p className={cn("text-xl font-bold text-emerald-700")}>
          {formatarMoeda(preview.comissao_final)}
        </p>
      </div>
    </article>
  );
}
