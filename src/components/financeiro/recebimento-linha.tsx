"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { TextoMarquee } from "@/components/shared/texto-marquee";
import {
  adicionarEncargoRecebimento,
  atualizarEncargoRecebimento,
  excluirEncargoRecebimento,
  atualizarRecebimento,
} from "@/lib/recebimento-viagem";
import { formatarMoeda } from "@/lib/frota-filters";
import {
  calcularTotalAReceber,
  RECEBIMENTO_ENCARGO_LABEL,
  RECEBIMENTO_ENCARGO_STATUS_LABEL,
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoEncargoStatus,
  type RecebimentoEncargoTipo,
  type RecebimentoStatus,
  type ViagemRecebimentoEncargo,
} from "@/types/recebimento";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import { cn, mebCard, mebFormSubsection } from "@/lib/utils";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

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

function somaEncargosPorTipo(
  encargos: RecebimentoComCanhotos["encargos"],
  tipo: RecebimentoEncargoTipo
) {
  return encargos
    .filter((e) => e.tipo === tipo)
    .reduce((s, e) => s + (Number(e.valor) || 0), 0);
}

export function RecebimentoLinha({
  item,
  onAtualizado,
}: {
  item: RecebimentoComCanhotos;
  onAtualizado: () => void;
}) {
  const [dataRecebimento, setDataRecebimento] = useState(item.data_recebimento ?? "");
  const [status, setStatus] = useState<RecebimentoStatus>(item.status);
  const [observacao, setObservacao] = useState(item.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [canhotosAbertos, setCanhotosAbertos] = useState(false);
  const [encargosAbertos, setEncargosAbertos] = useState(false);
  const [tipoEncargo, setTipoEncargo] = useState<RecebimentoEncargoTipo>("descarga");
  const [valorEncargo, setValorEncargo] = useState("");
  const [cteEncargo, setCteEncargo] = useState("");
  const [dataEncargo, setDataEncargo] = useState("");
  const [statusEncargo, setStatusEncargo] = useState<RecebimentoEncargoStatus>("sem_data");
  const [encargoEditandoId, setEncargoEditandoId] = useState<string | null>(null);
  const [salvandoEncargo, setSalvandoEncargo] = useState(false);

  const descargas = somaEncargosPorTipo(item.encargos, "descarga") || Number(item.valor_descargas_adicionais) || 0;
  const diarias = somaEncargosPorTipo(item.encargos, "diaria") || Number(item.valor_diarias) || 0;

  useEffect(() => {
    setDataRecebimento(item.data_recebimento ?? "");
    setStatus(item.status);
    setObservacao(item.observacao ?? "");
  }, [item]);

  const totalReceber = calcularTotalAReceber({
    valor_frete_liquido: item.valor_frete_liquido,
    valor_descargas_adicionais: descargas,
    valor_diarias: diarias,
    encargos: item.encargos,
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

  function limparFormEncargo() {
    setEncargoEditandoId(null);
    setTipoEncargo("descarga");
    setValorEncargo("");
    setCteEncargo("");
    setDataEncargo("");
    setStatusEncargo("sem_data");
  }

  function iniciarEdicaoEncargo(e: ViagemRecebimentoEncargo) {
    setEncargoEditandoId(e.id);
    setTipoEncargo(e.tipo);
    setValorEncargo(String(e.valor));
    setCteEncargo(e.numero_cte?.trim() ?? "");
    setDataEncargo(e.data_recebimento?.split("T")[0] ?? "");
    setStatusEncargo(e.status);
    setEncargosAbertos(true);
  }

  async function handleSalvarEncargo() {
    const valor = Number(valorEncargo.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      await mebAlert("Informe um valor maior que zero.");
      return;
    }
    setSalvandoEncargo(true);
    const payload = {
      tipo: tipoEncargo,
      valor,
      numero_cte: cteEncargo.trim() || null,
      data_recebimento: dataEncargo.trim() || null,
      status: dataEncargo.trim() ? statusEncargo : ("sem_data" as RecebimentoEncargoStatus),
    };
    const err = encargoEditandoId
      ? await atualizarEncargoRecebimento(encargoEditandoId, item.id, payload)
      : await adicionarEncargoRecebimento(item.id, payload);
    setSalvandoEncargo(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    limparFormEncargo();
    onAtualizado();
  }

  async function handleExcluirEncargo(e: ViagemRecebimentoEncargo) {
    if (
      !(await mebConfirm(
        `Excluir encargo de ${RECEBIMENTO_ENCARGO_LABEL[e.tipo]} (${formatarMoeda(e.valor)})?`,
        { variant: "danger", confirmLabel: "Excluir" }
      ))
    ) {
      return;
    }
    setSalvandoEncargo(true);
    const err = await excluirEncargoRecebimento(e.id, item.id);
    setSalvandoEncargo(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    if (encargoEditandoId === e.id) limparFormEncargo();
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
        <Campo label="Frete líquido sem encargos e imposto">
          <Valor className="text-slate-700" title="Frete bruto − ICMS (12%)">
            {formatarMoeda(item.valor_frete_liquido)}
          </Valor>
        </Campo>
        <Campo label="Descargas">
          <Valor className="font-medium text-slate-800">{formatarMoeda(descargas)}</Valor>
        </Campo>
        <Campo label="Diárias">
          <Valor className="font-medium text-slate-800">{formatarMoeda(diarias)}</Valor>
        </Campo>
        <Campo label="Total a receber com Encargos">
          <Valor className="font-bold text-amber-700" title="Frete líquido + encargos">
            {formatarMoeda(totalReceber)}
          </Valor>
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
              Encargos ({item.encargos.length})
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
            {encargoEditandoId ? "Editar encargo" : "Lançamento de encargo"}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Tipo"
              value={tipoEncargo}
              onChange={(e) => setTipoEncargo(e.target.value as RecebimentoEncargoTipo)}
              className={cn(inputCompact, "min-w-[140px]")}
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
              className={cn(inputCompact, "min-w-[120px]")}
              placeholder="0,00"
            />
            <Input
              label="Nº CT-e"
              value={cteEncargo}
              onChange={(e) => setCteEncargo(e.target.value)}
              className={cn(inputCompact, "min-w-[120px]")}
              placeholder="Informe o CT-e do encargo"
            />
            <Input
              label="Data para receber"
              type="date"
              value={dataEncargo}
              onChange={(e) => {
                setDataEncargo(e.target.value);
                if (!e.target.value) setStatusEncargo("sem_data");
                else if (statusEncargo === "sem_data") setStatusEncargo("pendente");
              }}
              className={cn(inputCompact, "min-w-[140px]")}
            />
            <Select
              label="Status do encargo"
              value={statusEncargo}
              onChange={(e) => setStatusEncargo(e.target.value as RecebimentoEncargoStatus)}
              className={cn(inputCompact, "min-w-[140px]")}
              options={(
                Object.entries(RECEBIMENTO_ENCARGO_STATUS_LABEL) as [
                  RecebimentoEncargoStatus,
                  string,
                ][]
              ).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Button
              type="button"
              variant="success"
              className="h-[34px] text-xs"
              disabled={salvandoEncargo}
              onClick={handleSalvarEncargo}
            >
              {salvandoEncargo ? "..." : encargoEditandoId ? "Salvar" : "Lançar"}
            </Button>
            {encargoEditandoId && (
              <Button
                type="button"
                variant="secondary"
                className="h-[34px] text-xs"
                disabled={salvandoEncargo}
                onClick={limparFormEncargo}
              >
                Cancelar edição
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-[34px] text-xs"
              disabled={salvandoEncargo}
              onClick={() => {
                setEncargosAbertos(false);
                limparFormEncargo();
              }}
            >
              Fechar
            </Button>
          </div>

          {item.encargos.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 font-semibold">CT-e</th>
                    <th className="px-3 py-2 font-semibold">Valor</th>
                    <th className="px-3 py-2 font-semibold">Data receb.</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {item.encargos.map((e) => (
                    <tr
                      key={e.id}
                      className={cn(
                        "border-t border-slate-100",
                        encargoEditandoId === e.id && "bg-cyan-50/60"
                      )}
                    >
                      <td className="px-3 py-2">{RECEBIMENTO_ENCARGO_LABEL[e.tipo]}</td>
                      <td className="px-3 py-2 font-mono">{e.numero_cte?.trim() || "—"}</td>
                      <td className="px-3 py-2 font-medium">{formatarMoeda(e.valor)}</td>
                      <td className="px-3 py-2">
                        {e.data_recebimento
                          ? new Date(`${e.data_recebimento}T12:00:00`).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{RECEBIMENTO_ENCARGO_STATUS_LABEL[e.status]}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-cyan-700 hover:underline"
                            disabled={salvandoEncargo}
                            onClick={() => iniciarEdicaoEncargo(e)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:underline"
                            disabled={salvandoEncargo}
                            onClick={() => handleExcluirEncargo(e)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nenhum encargo lançado ainda.</p>
          )}

          <p className="text-xs text-slate-500">
            Encargos lançados entram no{" "}
            <strong className="text-slate-700">Total a receber com Encargos</strong> (frete líquido
            sem ICMS + soma dos encargos).
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
        Frete líquido sem encargos e imposto = frete total − ICMS · Total com encargos = líquido +
        diárias + descargas
      </p>
    </div>
  );
}
