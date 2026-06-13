"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { TextoMarquee } from "@/components/shared/texto-marquee";
import { adicionarEncargoRecebimento, atualizarRecebimento } from "@/lib/recebimento-viagem";
import { formatarMoeda } from "@/lib/frota-filters";
import {
  calcularTotalAReceber,
  RECEBIMENTO_ENCARGO_LABEL,
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoEncargoTipo,
  type RecebimentoStatus,
} from "@/types/recebimento";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import { cn, mebCard, mebFormSubsection } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";

const inputCompact = "py-1.5 text-sm";

function Campo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <p className="text-xs text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function Valor({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <p title={title} className={cn("flex min-h-[34px] items-center text-sm", className)}>
      {children}
    </p>
  );
}

export function RecebimentoLinha({
  item,
  onAtualizado,
}: {
  item: RecebimentoComCanhotos;
  onAtualizado: () => void;
}) {
  const [descargas, setDescargas] = useState(Number(item.valor_descargas_adicionais) || 0);
  const [diarias, setDiarias] = useState(Number(item.valor_diarias) || 0);
  const [dataRecebimento, setDataRecebimento] = useState(item.data_recebimento ?? "");
  const [status, setStatus] = useState<RecebimentoStatus>(item.status);
  const [observacao, setObservacao] = useState(item.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [canhotosAbertos, setCanhotosAbertos] = useState(false);
  const [encargosAbertos, setEncargosAbertos] = useState(false);
  const [tipoEncargo, setTipoEncargo] = useState<RecebimentoEncargoTipo>("descarga");
  const [valorEncargo, setValorEncargo] = useState("");
  const [salvandoEncargo, setSalvandoEncargo] = useState(false);

  useEffect(() => {
    setDescargas(Number(item.valor_descargas_adicionais) || 0);
    setDiarias(Number(item.valor_diarias) || 0);
    setDataRecebimento(item.data_recebimento ?? "");
    setStatus(item.status);
    setObservacao(item.observacao ?? "");
  }, [item]);

  const totalReceber = calcularTotalAReceber({
    valor_frete_liquido: item.valor_frete_liquido,
    valor_descargas_adicionais: descargas,
    valor_diarias: diarias,
  });

  async function salvar() {
    setSalvando(true);
    const err = await atualizarRecebimento(item.id, {
      data_recebimento: dataRecebimento || null,
      status,
      observacao: observacao.trim() || null,
    });
    setSalvando(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    onAtualizado();
  }

  async function handleAdicionarEncargo() {
    const valor = Number(valorEncargo.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      await mebAlert("Informe um valor maior que zero.");
      return;
    }
    setSalvandoEncargo(true);
    const err = await adicionarEncargoRecebimento(item.id, tipoEncargo, valor);
    setSalvandoEncargo(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    setValorEncargo("");
    onAtualizado();
  }

  return (
    <div className={cn(mebCard, "min-w-0 overflow-hidden p-4")}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Campo label="Motorista">
          <TextoMarquee text={item.motorista_nome} className="font-medium text-slate-900" />
        </Campo>
        <Campo label="CTE">
          <TextoMarquee
            text={item.numero_cte?.trim() || "—"}
            className="font-mono text-slate-800"
          />
        </Campo>
        <Campo label="Placas">
          <TextoMarquee text={item.veiculos_placas} className="font-mono text-cyan-700" />
        </Campo>
        <Campo label="Fornecedor">
          <TextoMarquee text={item.empresa} className="text-slate-700" />
        </Campo>
        <Campo label="Frete total">
          <Valor className="font-medium text-emerald-700">
            {formatarMoeda(item.valor_frete_total)}
          </Valor>
        </Campo>
        <Campo label="Frete líquido">
          <Valor className="text-slate-700" title="Bruto − 12% ICMS">
            {formatarMoeda(item.valor_frete_liquido)}
          </Valor>
        </Campo>
        <Campo label="Descargas">
          <Valor className="font-medium text-slate-800">{formatarMoeda(descargas)}</Valor>
        </Campo>
        <Campo label="Diárias">
          <Valor className="font-medium text-slate-800">{formatarMoeda(diarias)}</Valor>
        </Campo>
        <Campo label="Total a receber">
          <Valor className="font-bold text-amber-700">{formatarMoeda(totalReceber)}</Valor>
        </Campo>
        <Campo label="Data receb." className="xl:col-span-2">
          <Input
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            className={cn(inputCompact, "min-w-[10.5rem] w-full")}
          />
        </Campo>
        <Campo label="Status" className="xl:col-span-2">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as RecebimentoStatus)}
            className={cn(inputCompact, "min-w-[9.5rem] w-full")}
            options={(
              Object.entries(RECEBIMENTO_STATUS_LABEL) as [RecebimentoStatus, string][]
            ).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Campo>
        <Campo label="Ações">
          <div className="flex min-h-[34px] flex-col justify-center gap-1">
            <Button
              type="button"
              variant="success"
              className="h-8 w-full px-2 text-xs"
              disabled={salvando}
              onClick={salvar}
            >
              {salvando ? "..." : "Salvar"}
            </Button>
            <button
              type="button"
              onClick={() => setCanhotosAbertos((v) => !v)}
              className="text-left text-xs text-cyan-700 hover:underline"
            >
              Canhotos ({item.canhotos.length})
            </button>
            <button
              type="button"
              onClick={() => setEncargosAbertos((v) => !v)}
              className="text-left text-xs text-cyan-700 hover:underline"
            >
              Encargos
            </button>
          </div>
        </Campo>
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-4">
        <Input
          label="Observação"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Anotações sobre o recebimento..."
          className="py-2 text-sm"
        />
      </div>

      {canhotosAbertos && (
        <div className={cn(mebFormSubsection, "mt-3")}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Canhotos da viagem
          </p>
          {item.canhotos.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhum canhoto anexado. Adicione no Acompanhamento da viagem.
            </p>
          ) : (
            <ul className="space-y-1">
              {item.canhotos.map((c) => (
                <li key={c.id}>
                  <AnexoArquivoRow label={c.file_name} storagePath={c.storage_path} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {encargosAbertos && (
        <div className={cn(mebFormSubsection, "mt-3 space-y-3")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lançamento de encargo
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Tipo"
              value={tipoEncargo}
              onChange={(e) => setTipoEncargo(e.target.value as RecebimentoEncargoTipo)}
              className={cn(inputCompact, "min-w-[160px]")}
              options={(
                Object.entries(RECEBIMENTO_ENCARGO_LABEL) as [RecebimentoEncargoTipo, string][]
              ).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              value={valorEncargo}
              onChange={(e) => setValorEncargo(e.target.value)}
              className={cn(inputCompact, "min-w-[140px]")}
              placeholder="0,00"
            />
            <Button
              type="button"
              variant="success"
              className="h-[34px] text-xs"
              disabled={salvandoEncargo}
              onClick={handleAdicionarEncargo}
            >
              {salvandoEncargo ? "..." : "Lançar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-[34px] text-xs"
              disabled={salvandoEncargo}
              onClick={() => {
                setEncargosAbertos(false);
                setValorEncargo("");
              }}
            >
              Fechar
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            O valor será somado em{" "}
            <strong className="text-slate-700">
              {tipoEncargo === "descarga" ? "Descargas" : "Diárias"}
            </strong>{" "}
            e incluído no total a receber.
          </p>
        </div>
      )}

      <p
        className={cn(
          "mt-2 text-[10px] text-slate-400",
          status === "vencido" && "text-red-600",
          status === "pago" && "text-emerald-600"
        )}
      >
        Frete líquido = frete total − 12% ICMS · Total = líquido + descargas + diárias
      </p>
    </div>
  );
}
