"use client";

import { useState } from "react";
import type { AcompanhamentoViagemItem } from "@/lib/acompanhamento-data";
import { textoResumoAcompanhamento } from "@/lib/acompanhamento-data";
import { atualizarEntregaAtual } from "@/lib/viagem-entrega-atual";
import { VIAGEM_STATUS_CORES, VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MapPin, Phone, Truck, User } from "lucide-react";

export function ViagemAcompanhamentoCard({
  viagem,
  clienteFiltro,
  selected,
  onSelect,
  onEntregaAtualizada,
}: {
  viagem: AcompanhamentoViagemItem;
  clienteFiltro?: string;
  selected?: boolean;
  onSelect?: () => void;
  onEntregaAtualizada?: () => void;
}) {
  const [salvandoEntrega, setSalvandoEntrega] = useState(false);
  const multiplasEntregas = viagem.entregas.length > 1;
  const statusLabel = VIAGEM_STATUS_LABEL[viagem.status] ?? viagem.status;
  const resumo = textoResumoAcompanhamento(viagem, statusLabel);
  const clienteAlvo = clienteFiltro?.trim().toLowerCase() ?? "";

  return (
    <article
      className={cn(
        "break-inside-avoid rounded-xl border bg-slate-800/40 p-5 shadow-sm transition print:border-slate-400 print:bg-white print:text-black print:shadow-none",
        selected
          ? "border-cyan-500 ring-1 ring-cyan-500/40"
          : "border-slate-700/50 hover:border-slate-600",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-500 print:text-gray-600">
            MEB Transportes — Acompanhamento
          </p>
          <p className="mt-1 text-lg font-bold text-white print:text-black">
            {viagem.motorista_nome}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold uppercase print:border print:border-gray-400 print:bg-gray-100 print:text-black",
            VIAGEM_STATUS_CORES[viagem.status] ?? "bg-slate-800 text-slate-300"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <p
        className={cn(
          "mb-4 rounded-lg border px-3 py-2 text-sm leading-relaxed print:border-gray-300 print:bg-gray-50 print:text-black",
          multiplasEntregas && !viagem.entrega_atual_ordem
            ? "border-amber-700/40 bg-amber-950/25 text-amber-100"
            : "border-cyan-800/30 bg-cyan-950/20 text-cyan-50"
        )}
      >
        {resumo}
      </p>

      {multiplasEntregas && (
        <div
          className="mb-4 print:hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Select
            label="Entrega atual do caminhão"
            value={
              viagem.entrega_atual_ordem != null
                ? String(viagem.entrega_atual_ordem)
                : ""
            }
            disabled={salvandoEntrega}
            onChange={async (e) => {
              const val = e.target.value;
              setSalvandoEntrega(true);
              const err = await atualizarEntregaAtual(
                viagem.id,
                val ? Number(val) : null
              );
              setSalvandoEntrega(false);
              if (err) {
                alert(err);
                return;
              }
              onEntregaAtualizada?.();
            }}
            options={[
              { value: "", label: "Selecione em qual entrega está..." },
              ...viagem.entregas.map((ent) => ({
                value: String(ent.ordem),
                label: `Entrega ${ent.ordem} — ${ent.local_entrega}`,
              })),
            ]}
          />
          {salvandoEntrega && (
            <p className="mt-1 text-xs text-slate-500">Salvando...</p>
          )}
        </div>
      )}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <InfoItem icon={Truck} label="Veículo(s)" value={viagem.veiculos_label} />
        <InfoItem icon={User} label="Motorista" value={viagem.motorista_nome} />
        {viagem.motorista_telefone && (
          <InfoItem icon={Phone} label="Telefone" value={viagem.motorista_telefone} />
        )}
        <InfoItem
          label="Saída"
          value={new Date(viagem.saida_em).toLocaleString("pt-BR")}
        />
        <InfoItem
          label="Chegada prevista"
          value={new Date(viagem.chegada_prevista_em).toLocaleString("pt-BR")}
        />
        <InfoItem label="CTE" value={viagem.numero_cte ?? "—"} />
        <InfoItem icon={MapPin} label="Local de saída" value={viagem.local_saida} />
      </dl>

      {viagem.entregas.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 print:text-gray-600">
            Entregas
          </p>
          <ol className="space-y-1.5">
            {viagem.entregas.map((e) => {
              const destaqueCliente =
                !!clienteAlvo && e.local_entrega.trim().toLowerCase() === clienteAlvo;
              const destaqueAtual = viagem.entrega_atual_ordem === e.ordem;
              return (
                <li
                  key={e.ordem}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm print:border-gray-300",
                    destaqueAtual
                      ? "border-orange-600/50 bg-orange-950/25 text-orange-100 print:bg-orange-50 print:text-black"
                      : destaqueCliente
                        ? "border-cyan-600/40 bg-cyan-950/20 text-cyan-100 print:bg-cyan-50 print:text-black"
                        : "border-slate-700/40 text-slate-300 print:text-black"
                  )}
                >
                  <span className="font-semibold">Entrega {e.ordem}:</span> {e.local_entrega}
                  {destaqueAtual && (
                    <span className="ml-2 text-xs font-bold uppercase text-orange-300 print:text-orange-800">
                      · Em andamento
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <p className="mt-4 text-[10px] text-slate-500 print:text-gray-500">
        Atualizado em {new Date().toLocaleString("pt-BR")}
      </p>
    </article>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2 text-slate-300 print:text-black">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 print:text-gray-600" />}
      <div>
        <dt className="text-xs text-slate-500 print:text-gray-600">{label}</dt>
        <dd className="font-medium text-slate-200 print:text-black">{value}</dd>
      </div>
    </div>
  );
}
