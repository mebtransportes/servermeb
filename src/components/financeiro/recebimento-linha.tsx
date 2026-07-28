"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  Paperclip,
  Receipt,
  Save,
  Truck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import {
  adicionarEncargoRecebimento,
  atualizarEncargoRecebimento,
  excluirEncargoRecebimento,
  atualizarRecebimento,
} from "@/lib/recebimento-viagem";
import { resolverStatusRecebimento } from "@/lib/recebimento-status";
import { formatarDataBr, formatarMoeda } from "@/lib/frota-filters";
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

const STATUS_STYLE: Record<
  RecebimentoStatus,
  { accent: string; badge: string }
> = {
  pendente: {
    accent: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-800",
  },
  vencido: {
    accent: "border-l-rose-500",
    badge: "bg-rose-100 text-rose-800",
  },
  pago: {
    accent: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
  },
};

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
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "muted" | "positive" | "emphasis";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        title={hint}
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          tone === "default" && "text-slate-800",
          tone === "muted" && "text-slate-600",
          tone === "positive" && "text-emerald-700",
          tone === "emphasis" && "text-amber-700"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ToggleLink({
  open,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  open: boolean;
  onClick: () => void;
  icon: typeof Paperclip;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
        open
          ? "border-cyan-200 bg-cyan-50 text-cyan-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          open ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-600"
        )}
      >
        {count}
      </span>
      <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
    </button>
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
  const [dataRecebimento, setDataRecebimento] = useState(
    item.data_recebimento?.split("T")[0] ?? ""
  );
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

  const descargas =
    somaEncargosPorTipo(item.encargos, "descarga") ||
    Number(item.valor_descargas_adicionais) ||
    0;
  const diarias =
    somaEncargosPorTipo(item.encargos, "diaria") || Number(item.valor_diarias) || 0;

  useEffect(() => {
    setDataRecebimento(item.data_recebimento?.split("T")[0] ?? "");
    setStatus(item.status);
    setObservacao(item.observacao ?? "");
  }, [item]);

  const totalReceber = calcularTotalAReceber({
    valor_frete_liquido: item.valor_frete_liquido,
    valor_descargas_adicionais: descargas,
    valor_diarias: diarias,
    encargos: item.encargos,
  });

  const statusVisual = STATUS_STYLE[status];

  async function salvar() {
    setSalvando(true);
    const statusSalvar = resolverStatusRecebimento(status, dataRecebimento || null);
    const err = await atualizarRecebimento(item.id, {
      data_recebimento: dataRecebimento || null,
      status: statusSalvar,
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
    <div
      className={cn(
        mebCard,
        "min-w-0 overflow-hidden border-l-4 p-4 shadow-sm",
        statusVisual.accent
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {item.motorista_nome || "—"}
            </h3>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                statusVisual.badge
              )}
            >
              {RECEBIMENTO_STATUS_LABEL[status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-mono text-slate-700">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              CT-e {item.numero_cte?.trim() || "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              Saída {item.saida_em ? formatarDataBr(item.saida_em) : "—"}
            </span>
            <span
              className="inline-flex min-w-0 max-w-[16rem] items-center gap-1 font-mono text-cyan-700"
              title={item.veiculos_placas || undefined}
            >
              <Truck className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
              <span className="truncate">{item.veiculos_placas || "—"}</span>
            </span>
          </div>
          <p className="truncate text-sm text-slate-600" title={item.empresa}>
            {item.empresa || "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Frete bruto"
          value={formatarMoeda(item.valor_frete_total)}
          tone="positive"
        />
        <Metric
          label="Líquido (sem ICMS)"
          value={formatarMoeda(item.valor_frete_liquido)}
          hint="Frete bruto − ICMS (12%)"
          tone="muted"
        />
        <Metric label="Descargas" value={formatarMoeda(descargas)} />
        <Metric label="Diárias" value={formatarMoeda(diarias)} />
        <Metric
          label="Total a receber"
          value={formatarMoeda(totalReceber)}
          hint="Frete líquido + encargos"
          tone="emphasis"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
        <Campo label="Data receb." className="min-w-[10.5rem] flex-1 sm:flex-none">
          <Input
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            className={cn(inputCompact, "w-full min-w-[10.5rem] bg-white")}
          />
        </Campo>
        <Campo label="Status" className="min-w-[9.5rem] flex-1 sm:flex-none">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as RecebimentoStatus)}
            className={cn(inputCompact, "w-full min-w-[9.5rem] bg-white")}
            options={(
              Object.entries(RECEBIMENTO_STATUS_LABEL) as [RecebimentoStatus, string][]
            ).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Campo>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="success"
            className="h-9 px-4 text-sm"
            disabled={salvando}
            onClick={salvar}
          >
            <Save className="h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
          <ToggleLink
            open={canhotosAbertos}
            onClick={() => setCanhotosAbertos((v) => !v)}
            icon={Paperclip}
            label="Canhotos"
            count={item.canhotos.length}
          />
          <ToggleLink
            open={encargosAbertos}
            onClick={() => setEncargosAbertos((v) => !v)}
            icon={Receipt}
            label="Encargos"
            count={item.encargos.length}
          />
        </div>
      </div>

      <div className="mt-3">
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
                          ? new Date(`${e.data_recebimento}T12:00:00`).toLocaleDateString(
                              "pt-BR"
                            )
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {RECEBIMENTO_ENCARGO_STATUS_LABEL[e.status]}
                      </td>
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
            <strong className="text-slate-700">Total a receber</strong> (frete líquido sem ICMS +
            soma dos encargos).
          </p>
        </div>
      )}
    </div>
  );
}
