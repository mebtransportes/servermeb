"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AcompanhamentoViagemItem } from "@/lib/acompanhamento-data";
import {
  formatarTextoWhatsAppAcompanhamento,
  textoResumoCurto,
  viagemPrecisaSelecionarParada,
} from "@/lib/acompanhamento-data";
import { atualizarEntregaAtual } from "@/lib/viagem-entrega-atual";
import { atualizarFornecedorAtual } from "@/lib/viagem-fornecedor-atual";
import { VIAGEM_STATUS_CORES, VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, mebCard } from "@/lib/utils";
import {
  Check,
  Clock,
  Copy,
  FileText,
  Flag,
  Pencil,
  Phone,
  Timer,
} from "lucide-react";
import { duracaoViagemAteChegada } from "@/lib/viagem-duracao";
import { atualizarChegadaViagem } from "@/lib/viagem-chegada";
import { isoParaDatetimeLocal } from "@/lib/viagem-crud";
import { mebAlert } from "@/lib/meb-dialog";

function encurtar(texto: string, max = 38) {
  const t = texto.trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

const STATUS_ACCENT: Record<string, string> = {
  AGENDADA: "border-l-indigo-500",
  "EM CARREGAMENTO": "border-l-amber-500",
  "EM ROTA": "border-l-sky-500",
  "EM MANUTENÇÃO": "border-l-rose-500",
  "AGUARDANDO DESCARGA": "border-l-violet-500",
  "DESCARGA EM ANDAMENTO": "border-l-orange-500",
  FINALIZADO: "border-l-emerald-500",
  "PAGAMENTO PENDENTE": "border-l-amber-500",
  ARQUIVADO: "border-l-slate-400",
  "EM ANDAMENTO": "border-l-blue-500",
  DESCARREGANDO: "border-l-orange-500",
  "EM ATRASO": "border-l-red-500",
  "CHEGOU AO DESTINO DE ENTREGA": "border-l-violet-500",
  "CHEGOU AO DESTINO FINAL": "border-l-indigo-500",
  "PARADO NA ESTRADA": "border-l-red-500",
};

export function ViagemAcompanhamentoCard({
  viagem,
  onAtualizado,
}: {
  viagem: AcompanhamentoViagemItem;
  onAtualizado?: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [chegadaEm, setChegadaEm] = useState(
    viagem.chegada_prevista_em ? isoParaDatetimeLocal(viagem.chegada_prevista_em) : ""
  );
  const [salvandoChegada, setSalvandoChegada] = useState(false);
  const multiplosFornecedores = viagem.fornecedores.length > 1;
  const multiplasEntregas = viagem.entregas.length > 1;
  const statusLabel = VIAGEM_STATUS_LABEL[viagem.status] ?? viagem.status;
  const resumoCurto = textoResumoCurto(viagem, statusLabel);
  const precisaSelecionar = viagemPrecisaSelecionarParada(viagem);
  const editarHref = `/operacional/acompanhamento/${viagem.id}`;
  const duracaoViagem = duracaoViagemAteChegada(viagem);
  const accent = STATUS_ACCENT[viagem.status] ?? "border-l-slate-400";

  async function salvarChegada() {
    if (!chegadaEm) {
      await mebAlert("Informe a data e hora de chegada.");
      return;
    }
    setSalvandoChegada(true);
    const err = await atualizarChegadaViagem(viagem.id, new Date(chegadaEm).toISOString());
    setSalvandoChegada(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    onAtualizado?.();
  }

  useEffect(() => {
    setChegadaEm(
      viagem.chegada_prevista_em ? isoParaDatetimeLocal(viagem.chegada_prevista_em) : ""
    );
  }, [viagem.chegada_prevista_em]);

  async function copiarWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const texto = formatarTextoWhatsAppAcompanhamento(viagem, statusLabel);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      await mebAlert("Não foi possível copiar. Tente novamente.");
    }
  }

  return (
    <article
      className={cn(
        "meb-acompanhamento break-inside-avoid border-l-4 p-3.5 shadow-sm transition print:border print:border-slate-400 print:bg-white print:p-2 print:text-black print:shadow-none",
        mebCard,
        accent,
        "hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 print:text-black">
            {viagem.motorista_nome}
          </p>
          <p className="truncate text-xs text-slate-500 print:text-gray-600">
            {viagem.veiculos_label}
          </p>
        </div>
        <span
          className={cn(
            "meb-status-badge shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase print:border print:border-gray-400 print:bg-gray-100 print:text-black",
            VIAGEM_STATUS_CORES[viagem.status] ?? "bg-slate-100 text-slate-600"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <p
        className={cn(
          "mb-2.5 rounded-lg border px-2.5 py-1.5 text-xs leading-snug print:border-gray-300 print:bg-gray-50 print:text-black",
          precisaSelecionar
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-slate-200/80 bg-slate-50/80 text-slate-700"
        )}
      >
        {resumoCurto}
      </p>

      <div className="mb-2.5 space-y-1 text-[11px] text-slate-500 print:text-gray-700">
        {viagem.motorista_telefone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
            {viagem.motorista_telefone}
          </p>
        )}
        {viagem.numero_cte && (
          <p className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 shrink-0 text-slate-400" />
            CTE {viagem.numero_cte}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Flag className="h-3 w-3 shrink-0 text-slate-400" />
          {viagem.saida_em
            ? new Date(viagem.saida_em).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "Saída a definir"}
        </p>
        {viagem.chegada_prevista_em && (
          <p className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
            Chegada:{" "}
            {new Date(viagem.chegada_prevista_em).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        )}
        {duracaoViagem && (
          <p className="flex items-center gap-1.5 font-medium text-emerald-700">
            <Timer className="h-3 w-3 shrink-0" />
            Duração: {duracaoViagem}
          </p>
        )}
      </div>

      {viagem.fornecedores.length > 0 && (
        <div className="mb-1.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:text-gray-600">
            Origem
          </p>
          <ul className="flex flex-wrap gap-1">
            {viagem.fornecedores.map((f) => {
              const destaqueAtual = viagem.fornecedor_atual_ordem === f.ordem;
              return (
                <li
                  key={`f-${f.ordem}`}
                  title={f.local_fornecedor}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] print:border print:border-gray-300",
                    destaqueAtual
                      ? "bg-violet-100 font-semibold text-violet-800 print:bg-violet-50 print:text-black"
                      : "bg-slate-100 text-slate-600 print:text-black"
                  )}
                >
                  F{f.ordem}) {encurtar(f.local_fornecedor)}
                  {destaqueAtual && " ●"}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {viagem.entregas.length > 0 && (
        <div className="mb-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:text-gray-600">
            Entregas
          </p>
          <ul className="flex flex-wrap gap-1">
            {viagem.entregas.map((e) => {
              const destaqueAtual = viagem.entrega_atual_ordem === e.ordem;
              return (
                <li
                  key={`e-${e.ordem}`}
                  title={e.local_entrega}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] print:border print:border-gray-300",
                    destaqueAtual
                      ? "bg-orange-100 font-semibold text-orange-800 print:bg-orange-50 print:text-black"
                      : "bg-slate-100 text-slate-600 print:text-black"
                  )}
                >
                  E{e.ordem}) {encurtar(e.local_entrega)}
                  {destaqueAtual && " ●"}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-2.5 space-y-2 print:hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="Data e hora de chegada"
            type="datetime-local"
            value={chegadaEm}
            disabled={salvandoChegada}
            onChange={(e) => setChegadaEm(e.target.value)}
            className="min-w-0 flex-1 py-2 text-xs"
          />
          <div className="flex flex-col gap-1">
            <span className="invisible text-sm font-medium" aria-hidden>
              .
            </span>
            <Button
              type="button"
              variant="secondary"
              className="h-10 shrink-0 text-xs"
              disabled={
                salvandoChegada ||
                chegadaEm ===
                  (viagem.chegada_prevista_em
                    ? isoParaDatetimeLocal(viagem.chegada_prevista_em)
                    : "")
              }
              onClick={salvarChegada}
            >
              {salvandoChegada ? "..." : "Salvar"}
            </Button>
          </div>
        </div>
        {multiplosFornecedores && (
          <Select
            label="Fornecedor atual (origem)"
            value={
              viagem.fornecedor_atual_ordem != null
                ? String(viagem.fornecedor_atual_ordem)
                : ""
            }
            disabled={salvando}
            onChange={async (e) => {
              const val = e.target.value;
              setSalvando(true);
              const err = await atualizarFornecedorAtual(
                viagem.id,
                val ? Number(val) : null
              );
              setSalvando(false);
              if (err) {
                await mebAlert(err);
                return;
              }
              onAtualizado?.();
            }}
            options={[
              { value: "", label: "Qual fornecedor?" },
              ...viagem.fornecedores.map((f) => ({
                value: String(f.ordem),
                label: `F${f.ordem}) ${encurtar(f.local_fornecedor, 28)}`,
              })),
            ]}
          />
        )}
        {multiplasEntregas && (
          <Select
            label="Entrega atual (destino)"
            value={
              viagem.entrega_atual_ordem != null
                ? String(viagem.entrega_atual_ordem)
                : ""
            }
            disabled={salvando}
            onChange={async (e) => {
              const val = e.target.value;
              setSalvando(true);
              const err = await atualizarEntregaAtual(
                viagem.id,
                val ? Number(val) : null
              );
              setSalvando(false);
              if (err) {
                await mebAlert(err);
                return;
              }
              onAtualizado?.();
            }}
            options={[
              { value: "", label: "Qual entrega?" },
              ...viagem.entregas.map((ent) => ({
                value: String(ent.ordem),
                label: `E${ent.ordem}) ${encurtar(ent.local_entrega, 28)}`,
              })),
            ]}
          />
        )}
      </div>

      <div
        className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 print:hidden"
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
              <Check className="h-3.5 w-3.5" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar p/ WhatsApp
            </>
          )}
        </Button>
        <Link href={editarHref} className="inline-flex">
          <Button type="button" variant="ghost" className="h-8 text-xs">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </Link>
      </div>
    </article>
  );
}
