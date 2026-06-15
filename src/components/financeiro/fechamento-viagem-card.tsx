"use client";

import type { ViagemFechamento } from "@/types/fechamento";
import { getComissaoPercent, getIcmsPercent, paramsComissionamentoFechamento } from "@/types/fechamento";
import { formatarMoeda } from "@/lib/frota-filters";
import { Select } from "@/components/ui/select";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { Button } from "@/components/ui/button";
import {
  FechamentoViagemDetalhe,
  useFechamentoValores,
} from "@/components/financeiro/fechamento-viagem-detalhe";
import { gerarPdfFechamentoViagem } from "@/lib/fechamento-relatorio-pdf";
import { useEffect, useState } from "react";
import { parseBrNumber } from "@/lib/number-format";
import { atualizarFechamentoConfig } from "@/lib/fechamento-data";
import { cn, mebCard, mebFormSubsection } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";
import { FileText } from "lucide-react";

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
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const isTerceiro = !!f.motorista_terceiro;

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
    const comissaoParams = paramsComissionamentoFechamento(f);
    const result = await atualizarFechamentoConfig({
      id: f.id,
      valorFrete: Number(f.valor_frete) || 0,
      reembolso: Number(f.reembolso_valor) || 0,
      icmsPercent: icms,
      comissaoTipo,
      comissaoPercent: comPerc,
      motoristaTerceiro: isTerceiro,
      adiantamentoValor: f.adiantamento_valor,
      totalDespesas: comissaoParams.totalDespesasCalc,
      totalDespesasMotorista: comissaoParams.totalDespesasMotoristaCalc,
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

  async function handleGerarRelatorio() {
    setGerandoPdf(true);
    try {
      await gerarPdfFechamentoViagem(f);
    } catch (e) {
      await mebAlert(e instanceof Error ? e.message : "Erro ao gerar relatório.");
    }
    setGerandoPdf(false);
  }

  return (
    <article className={cn(mebCard, "p-4")}>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={gerandoPdf}
          onClick={handleGerarRelatorio}
        >
          <FileText className="mr-2 h-4 w-4" />
          {gerandoPdf ? "Gerando..." : "Gerar relatório PDF"}
        </Button>
      </div>

      <FechamentoViagemDetalhe
        f={f}
        icmsPercent={icms}
        comissaoPercent={comPerc}
        comissaoTipo={comissaoTipo}
        showHeader
        showComissaoFinal={false}
      />

      {!isTerceiro && (
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
                { value: "PERCENTUAL", label: "Percentual sobre frete − gastos" },
                { value: "LIQUIDO_TOTAL", label: "Frete − gastos (100%)" },
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
      )}

      {isTerceiro && (
        <div className={cn(mebFormSubsection, "mt-3")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <BrNumberInput
              label="ICMS (%)"
              decimalPlaces={2}
              value={icmsPercent}
              onChange={setIcmsPercent}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Salve para gravar o percentual de ICMS.</p>
            <div className="flex items-center gap-2">
              {salvoMsg && (
                <span className="text-xs font-medium text-emerald-700">Salvo!</span>
              )}
              <Button type="button" variant="success" disabled={saving} onClick={handleSalvar}>
                {saving ? "Salvando..." : "Salvar ICMS"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "mt-2 rounded-lg border px-3 py-2 text-center",
          isTerceiro
            ? "border-cyan-200 bg-cyan-50/80"
            : "border-emerald-200 bg-emerald-50/80"
        )}
      >
        <p className="text-xs text-slate-600">
          {isTerceiro
            ? "Valor líquido para repassar ao terceiro"
            : "Comissão líquida (bruta + reembolso − adiantamentos)"}
        </p>
        <p
          className={cn(
            "text-xl font-bold",
            isTerceiro ? "text-cyan-800" : "text-emerald-700"
          )}
        >
          {formatarMoeda(preview.comissao_final)}
        </p>
      </div>
    </article>
  );
}
