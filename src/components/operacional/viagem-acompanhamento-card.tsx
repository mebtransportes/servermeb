"use client";

import { useState } from "react";
import type { AcompanhamentoViagemItem } from "@/lib/acompanhamento-data";
import {
  formatarTextoWhatsAppAcompanhamento,
  textoResumoCurto,
} from "@/lib/acompanhamento-data";
import { atualizarEntregaAtual } from "@/lib/viagem-entrega-atual";
import { VIAGEM_STATUS_CORES, VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy, Paperclip } from "lucide-react";
import { ViagemCanhotos } from "@/components/operacional/viagem-canhotos";

function encurtar(texto: string, max = 38) {
  const t = texto.trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

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
  const [copiado, setCopiado] = useState(false);
  const multiplasEntregas = viagem.entregas.length > 1;
  const statusLabel = VIAGEM_STATUS_LABEL[viagem.status] ?? viagem.status;
  const resumoCurto = textoResumoCurto(viagem, statusLabel);
  const clienteAlvo = clienteFiltro?.trim().toLowerCase() ?? "";

  async function copiarWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const texto = formatarTextoWhatsAppAcompanhamento(viagem, statusLabel);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert("Não foi possível copiar. Tente novamente.");
    }
  }

  return (
    <article
      className={cn(
        "break-inside-avoid rounded-lg border bg-slate-800/50 p-3 shadow-sm transition print:border-slate-400 print:bg-white print:p-2 print:text-black print:shadow-none",
        selected
          ? "border-cyan-500 ring-1 ring-cyan-500/40"
          : "border-slate-700/50 hover:border-slate-600"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white print:text-black">
            {viagem.motorista_nome}
          </p>
          <p className="truncate text-xs text-slate-400 print:text-gray-600">
            {viagem.veiculos_label}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase print:border print:border-gray-400 print:bg-gray-100 print:text-black",
            VIAGEM_STATUS_CORES[viagem.status] ?? "bg-slate-800 text-slate-300"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <p
        className={cn(
          "mb-2 rounded-md border px-2 py-1.5 text-xs leading-snug print:border-gray-300 print:bg-gray-50 print:text-black",
          multiplasEntregas && !viagem.entrega_atual_ordem
            ? "border-amber-700/40 bg-amber-950/30 text-amber-100"
            : "border-cyan-800/30 bg-cyan-950/20 text-cyan-100"
        )}
      >
        {resumoCurto}
      </p>

      <div className="mb-2 space-y-0.5 text-[11px] text-slate-400 print:text-gray-700">
        {viagem.motorista_telefone && <p>📱 {viagem.motorista_telefone}</p>}
        {viagem.numero_cte && <p>📋 CTE {viagem.numero_cte}</p>}
        <p>🏁 {new Date(viagem.saida_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
      </div>

      {viagem.entregas.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1">
          {viagem.entregas.map((e) => {
            const destaqueCliente =
              !!clienteAlvo && e.local_entrega.trim().toLowerCase() === clienteAlvo;
            const destaqueAtual = viagem.entrega_atual_ordem === e.ordem;
            return (
              <li
                key={e.ordem}
                title={e.local_entrega}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] print:border print:border-gray-300",
                  destaqueAtual
                    ? "bg-orange-900/40 font-semibold text-orange-200 print:bg-orange-50 print:text-black"
                    : destaqueCliente
                      ? "bg-cyan-900/30 text-cyan-200 print:bg-cyan-50 print:text-black"
                      : "bg-slate-800/60 text-slate-400 print:text-black"
                )}
              >
                {e.ordem}) {encurtar(e.local_entrega)}
                {destaqueAtual && " ●"}
              </li>
            );
          })}
        </ul>
      )}

      {multiplasEntregas && (
        <div className="mb-2 print:hidden" onClick={(e) => e.stopPropagation()}>
          <Select
            label="Entrega atual"
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
              { value: "", label: "Qual entrega?" },
              ...viagem.entregas.map((ent) => ({
                value: String(ent.ordem),
                label: `${ent.ordem}) ${encurtar(ent.local_entrega, 28)}`,
              })),
            ]}
          />
        </div>
      )}

      {selected && (
        <div className="mb-2 print:hidden" onClick={(e) => e.stopPropagation()}>
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
            <Paperclip className="h-3 w-3" /> Canhotos
          </p>
          <ViagemCanhotos viagemId={viagem.id} compact />
        </div>
      )}

      <div
        className="flex flex-wrap gap-1.5 print:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="secondary"
          className="h-8 flex-1 text-xs"
          onClick={copiarWhatsApp}
        >
          {copiado ? (
            <>
              <Check className="mr-1 h-3.5 w-3.5" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copiar p/ WhatsApp
            </>
          )}
        </Button>
        {onSelect && (
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {selected ? "Fechar" : "Editar"}
          </Button>
        )}
      </div>
    </article>
  );
}
