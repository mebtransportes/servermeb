"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ViagemRecursos } from "@/components/operacional/viagem-recursos";
import { ViagemKmOdometro } from "@/components/operacional/viagem-km-odometro";
import { VIAGEM_STATUS } from "@/lib/viagem-validation";
import { isFrota } from "@/lib/viagem-validation";
import { excluirAnexoTabela } from "@/lib/anexos-crud";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import type { Viagem, ViagemStatus } from "@/types";
import { MapPin } from "lucide-react";
import { cn, mebFormSubsection } from "@/lib/utils";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { resolverDataPagamentoTerceiro, normalizarDataPagamento } from "@/lib/viagem-pagamento-terceiro";
import { syncKmInicialAoAbrirViagem } from "@/lib/veiculo-km";
import { syncRecebimentoViagem, aplicarDataPagamentoViagemNoRecebimento } from "@/lib/recebimento-viagem";
import { ViagemCanhotos } from "@/components/operacional/viagem-canhotos";
import { ViagemComprovantesDescarga } from "@/components/operacional/viagem-comprovantes-descarga";
import {
  statusGeraFechamento,
  VIAGEM_STATUS_CORES,
  VIAGEM_STATUS_LABEL,
} from "@/lib/viagem-status";
import { formatarVeiculosLabel, isoParaDatetimeLocal } from "@/lib/viagem-crud";
import { atualizarChegadaViagem } from "@/lib/viagem-chegada";
import { duracaoViagemAteChegada } from "@/lib/viagem-duracao";
import { Input } from "@/components/ui/input";
import { VEICULO_TIPO_OPCOES } from "@/lib/viagem-validation";
import type { Veiculo } from "@/types";

export function ViagemDetail({
  viagemId,
  onUpdated,
}: {
  viagemId: string;
  onUpdated: () => void;
}) {
  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [veiculosViagem, setVeiculosViagem] = useState<
    { nome: string; placa: string; tipo?: Veiculo["tipo"] }[]
  >([]);
  const [fornecedores, setFornecedores] = useState<
    { local_fornecedor: string; ordem: number }[]
  >([]);
  const [entregas, setEntregas] = useState<{ local_entrega: string; ordem: number }[]>([]);
  const [anexos, setAnexos] = useState<
    { id: string; categoria: string; file_name: string; storage_path: string }[]
  >([]);
  const [status, setStatus] = useState<ViagemStatus>("EM CARREGAMENTO");
  const [fornecedorAtualOrdem, setFornecedorAtualOrdem] = useState("");
  const [entregaAtualOrdem, setEntregaAtualOrdem] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshKm, setRefreshKm] = useState(0);
  const [chegadaEm, setChegadaEm] = useState("");
  const [salvandoChegada, setSalvandoChegada] = useState(false);
  const [dataPagamento, setDataPagamento] = useState("");
  const [salvandoDataPagamento, setSalvandoDataPagamento] = useState(false);

  const load = async () => {
    const supabase = createClient();
    await syncKmInicialAoAbrirViagem(viagemId);
    const { data: v } = await supabase
      .from("viagens")
      .select(
        "*, motoristas(*), veiculos(*), viagem_veiculos(ordem, veiculos(nome, placa, tipo))"
      )
      .eq("id", viagemId)
      .single();
    if (v) {
      setViagem(v as Viagem);
      setStatus(v.status);
      setFornecedorAtualOrdem(
        v.fornecedor_atual_ordem != null ? String(v.fornecedor_atual_ordem) : ""
      );
      setEntregaAtualOrdem(
        v.entrega_atual_ordem != null ? String(v.entrega_atual_ordem) : ""
      );
      setChegadaEm(
        v.chegada_prevista_em ? isoParaDatetimeLocal(v.chegada_prevista_em) : ""
      );
      setDataPagamento(
        (() => {
          const motoristaRaw = (v as Viagem).motoristas;
          const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;
          const terceiro = motorista?.vinculo != null && !isFrota(motorista.vinculo);
          if (terceiro) {
            return resolverDataPagamentoTerceiro(v as Viagem) ?? "";
          }
          return normalizarDataPagamento(v.data_pagamento) ?? "";
        })()
      );
      const vv = v.viagem_veiculos as
        | {
            ordem: number;
            veiculos: { nome: string; placa: string; tipo?: Veiculo["tipo"] } | {
                nome: string;
                placa: string;
                tipo?: Veiculo["tipo"];
              }[];
          }[]
        | null;
      const lista = (vv ?? [])
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => {
          const veic = item.veiculos;
          return Array.isArray(veic) ? veic[0] : veic;
        })
        .filter(
          (veic): veic is { nome: string; placa: string; tipo?: Veiculo["tipo"] } =>
            !!veic
        );
      const fallback = v.veiculos as Veiculo | Veiculo[] | null;
      const veiculoUnico = Array.isArray(fallback) ? fallback[0] : fallback;
      setVeiculosViagem(
        lista.length > 0
          ? lista
          : veiculoUnico
            ? [
                {
                  nome: veiculoUnico.nome,
                  placa: veiculoUnico.placa,
                  tipo: veiculoUnico.tipo,
                },
              ]
            : []
      );
    }

    const { data: f } = await supabase
      .from("viagem_fornecedores")
      .select("local_fornecedor, ordem")
      .eq("viagem_id", viagemId)
      .order("ordem");

    const { data: e } = await supabase
      .from("viagem_entregas")
      .select("local_entrega, ordem")
      .eq("viagem_id", viagemId)
      .order("ordem");

    const listaForn = f ?? [];
    setFornecedores(
      listaForn.length > 0
        ? listaForn
        : v?.local_saida
          ? [{ ordem: 1, local_fornecedor: v.local_saida }]
          : []
    );
    setEntregas(e ?? []);

    const { data: a } = await supabase
      .from("viagem_anexos")
      .select("id, categoria, file_name, storage_path")
      .eq("viagem_id", viagemId)
      .is("recurso_id", null);
    setAnexos(a ?? []);
    setRefreshKm((n) => n + 1);
  };

  useEffect(() => {
    load();
  }, [viagemId]);

  async function saveStatus() {
    setSaving(true);
    const supabase = createClient();
    const fornecedorOrdem =
      fornecedores.length > 1 && fornecedorAtualOrdem
        ? Number(fornecedorAtualOrdem)
        : null;
    const entregaOrdem =
      entregas.length > 1 && entregaAtualOrdem ? Number(entregaAtualOrdem) : null;

    const valorPagamento = normalizarDataPagamento(dataPagamento.trim() || null);
    const motoristaRaw = viagem?.motoristas;
    const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;
    const terceiro = motorista?.vinculo != null && !isFrota(motorista.vinculo);
    const pagamentoSalvo = viagem
      ? terceiro
        ? resolverDataPagamentoTerceiro(viagem) ?? ""
        : normalizarDataPagamento(viagem.data_pagamento) ?? ""
      : "";

    const updatePayload: {
      status: string;
      fornecedor_atual_ordem: number | null;
      entrega_atual_ordem: number | null;
      data_pagamento?: string | null;
      data_pagamento_terceiro?: string | null;
    } = {
      status,
      fornecedor_atual_ordem: fornecedorOrdem,
      entrega_atual_ordem: entregaOrdem,
    };

    if (valorPagamento !== (pagamentoSalvo || null)) {
      updatePayload.data_pagamento = valorPagamento;
      if (terceiro) {
        updatePayload.data_pagamento_terceiro = valorPagamento;
      }
    }

    await supabase.from("viagens").update(updatePayload).eq("id", viagemId);
    if (statusGeraFechamento(status)) {
      const err = await syncFechamentoViagem(viagemId);
      if (err) console.warn("Fechamento:", err);
    }
    if (status === "ARQUIVADO") {
      const dataRec =
        valorPagamento !== (pagamentoSalvo || null)
          ? valorPagamento
          : pagamentoSalvo || null;
      const errRec = await syncRecebimentoViagem(viagemId);
      if (errRec) console.warn("Recebimento:", errRec);
      else if (dataRec) {
        const errData = await aplicarDataPagamentoViagemNoRecebimento(viagemId, dataRec);
        if (errData) console.warn("Data recebimento:", errData);
      }
    }
    setSaving(false);
    onUpdated();
    load();
  }

  async function saveChegada() {
    if (!chegadaEm) {
      await mebAlert("Informe a data e hora de chegada.");
      return;
    }
    setSalvandoChegada(true);
    const err = await atualizarChegadaViagem(viagemId, new Date(chegadaEm).toISOString());
    setSalvandoChegada(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    onUpdated();
    load();
  }

  async function saveDataPagamento() {
    if (!viagem) return;
    setSalvandoDataPagamento(true);
    const supabase = createClient();
    const valor = normalizarDataPagamento(dataPagamento.trim() || null);
    const motoristaRaw = viagem.motoristas;
    const motorista = Array.isArray(motoristaRaw) ? motoristaRaw[0] : motoristaRaw;
    const terceiro = motorista?.vinculo != null && !isFrota(motorista.vinculo);

    const payload: { data_pagamento: string | null; data_pagamento_terceiro?: string | null } = {
      data_pagamento: valor,
    };
    if (terceiro) {
      payload.data_pagamento_terceiro = valor;
    }

    const { error } = await supabase.from("viagens").update(payload).eq("id", viagemId);

    if (error) {
      setSalvandoDataPagamento(false);
      await mebAlert(error.message);
      return;
    }

    if (statusGeraFechamento(status)) {
      const errFech = await syncFechamentoViagem(viagemId);
      if (errFech) {
        setSalvandoDataPagamento(false);
        await mebAlert(errFech);
        return;
      }
    }

    if (status === "ARQUIVADO") {
      const errRec = await aplicarDataPagamentoViagemNoRecebimento(viagemId, valor);
      if (errRec) {
        setSalvandoDataPagamento(false);
        await mebAlert(errRec);
        return;
      }
    }

    setSalvandoDataPagamento(false);
    onUpdated();
    load();
  }

  if (!viagem) return <p className="text-slate-500">Carregando...</p>;

  const duracaoViagem = duracaoViagemAteChegada(viagem);

  const motoristaTerceiro =
    viagem.motoristas?.vinculo != null && !isFrota(viagem.motoristas.vinculo);
  const dataPagamentoSalva = motoristaTerceiro
    ? resolverDataPagamentoTerceiro(viagem) ?? ""
    : normalizarDataPagamento(viagem.data_pagamento) ?? "";

  const m = viagem.motoristas;
  const veiculosLabel = formatarVeiculosLabel(veiculosViagem);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {m?.nome_completo ?? "Motorista"} · {veiculosLabel}
          </h2>
          <p className="text-sm text-slate-500">
            {viagem.data_contratacao && (
              <>
                Contratação:{" "}
                {new Date(viagem.data_contratacao).toLocaleString("pt-BR")}
                {" · "}
              </>
            )}
            Saída:{" "}
            {viagem.saida_em
              ? new Date(viagem.saida_em).toLocaleString("pt-BR")
              : "A definir (viagem agendada)"}
            {duracaoViagem && (
              <>
                {" "}
                · Duração: <span className="font-medium text-slate-700">{duracaoViagem}</span>
              </>
            )}
          </p>
        </div>
        <span
          className={cn(
            "meb-status-badge rounded-full px-3 py-1 text-xs font-semibold",
            VIAGEM_STATUS_CORES[viagem.status] ?? "bg-slate-100 text-slate-600"
          )}
        >
          {VIAGEM_STATUS_LABEL[viagem.status] ?? viagem.status}
        </span>
      </div>

      <div className={cn(mebFormSubsection, "space-y-3")}>
        <h3 className="font-semibold text-slate-800">Atualizar status</h3>
        <div className="flex flex-wrap gap-3">
          <Select
            label="Status da viagem"
            tone="light"
            value={status}
            onChange={(e) => setStatus(e.target.value as ViagemStatus)}
            options={VIAGEM_STATUS.map((s) => ({
              value: s,
              label: VIAGEM_STATUS_LABEL[s] ?? s,
            }))}
          />
          {fornecedores.length > 1 && (
            <Select
              label="Fornecedor atual (origem)"
              tone="light"
              value={fornecedorAtualOrdem}
              onChange={(e) => setFornecedorAtualOrdem(e.target.value)}
              options={[
                { value: "", label: "Selecione o fornecedor atual..." },
                ...fornecedores.map((f) => ({
                  value: String(f.ordem),
                  label: `Fornecedor ${f.ordem} — ${f.local_fornecedor}`,
                })),
              ]}
            />
          )}
          {entregas.length > 1 && (
            <Select
              label="Entrega atual (em qual parada está)"
              tone="light"
              value={entregaAtualOrdem}
              onChange={(e) => setEntregaAtualOrdem(e.target.value)}
              options={[
                { value: "", label: "Selecione a entrega atual..." },
                ...entregas.map((e) => ({
                  value: String(e.ordem),
                  label: `Entrega ${e.ordem} — ${e.local_entrega}`,
                })),
              ]}
            />
          )}
          <Button
            type="button"
            variant="success"
            onClick={saveStatus}
            disabled={
              saving ||
              (status === viagem.status &&
                String(viagem.fornecedor_atual_ordem ?? "") === fornecedorAtualOrdem &&
                String(viagem.entrega_atual_ordem ?? "") === entregaAtualOrdem)
            }
            className="self-end"
          >
            {saving ? "Salvando..." : "Salvar status"}
          </Button>
        </div>
        {(fornecedores.length > 1 || entregas.length > 1) && (
          <p className="mt-2 text-xs text-amber-800">
            {fornecedores.length > 1 && (
              <>
                Esta viagem tem <strong>{fornecedores.length} fornecedores</strong>.{" "}
              </>
            )}
            {entregas.length > 1 && (
              <>
                Esta viagem tem <strong>{entregas.length} entregas</strong>.{" "}
              </>
            )}
            Informe fornecedor e entrega atuais para o acompanhamento e o texto do WhatsApp
            ficarem corretos.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          <strong className="text-slate-600">Finalizado</strong> e{" "}
          <strong className="text-slate-600">Pagamento pendente</strong> aparecem no Fechamento de
          viagens. <strong className="text-slate-600">Arquivado</strong> remove do fechamento
          (comissão já paga) e envia para <strong className="text-slate-600">Recebimentos</strong>.
        </p>
      </div>

      <div className={cn(mebFormSubsection, "space-y-3")}>
        <h3 className="font-semibold text-slate-800">Chegada da viagem</h3>
        <p className="text-xs text-slate-500">
          Informe manualmente quando a viagem chegou ao destino final.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Data e hora de chegada"
            type="datetime-local"
            tone="light"
            value={chegadaEm}
            onChange={(e) => setChegadaEm(e.target.value)}
            className="min-w-[220px]"
          />
          <Button
            type="button"
            variant="success"
            onClick={saveChegada}
            disabled={
              salvandoChegada ||
              chegadaEm ===
                (viagem.chegada_prevista_em
                  ? isoParaDatetimeLocal(viagem.chegada_prevista_em)
                  : "")
            }
          >
            {salvandoChegada ? "Salvando..." : "Salvar chegada"}
          </Button>
        </div>
        {viagem.chegada_prevista_em && (
          <p className="text-sm text-slate-600">
            Chegada registrada:{" "}
            <strong className="text-slate-800">
              {new Date(viagem.chegada_prevista_em).toLocaleString("pt-BR")}
            </strong>
            {duracaoViagem && (
              <>
                {" "}
                · Tempo de viagem:{" "}
                <strong className="text-emerald-700">{duracaoViagem}</strong>
              </>
            )}
          </p>
        )}
      </div>

      <div className={cn(mebFormSubsection, "space-y-3")}>
        <h3 className="font-semibold text-slate-800">Data de pagamento</h3>
        <p className="text-xs text-slate-500">
          Data prevista para receber o frete desta viagem. Em viagens com motorista terceiro,
          também alimenta o fechamento financeiro. Se informada aqui, aparece automaticamente em{" "}
          <strong className="text-slate-600">Financeiro → Recebimentos</strong> quando a viagem
          for arquivada. Se deixar em branco, preencha depois em Recebimentos ou no fechamento.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Data de pagamento"
            type="date"
            tone="light"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className="min-w-[180px]"
          />
          <Button
            type="button"
            variant="success"
            onClick={saveDataPagamento}
            disabled={salvandoDataPagamento || dataPagamento === dataPagamentoSalva}
          >
            {salvandoDataPagamento ? "Salvando..." : "Salvar data"}
          </Button>
        </div>
      </div>

      {veiculosViagem.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Veículos</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {veiculosViagem.map((ve) => {
              const tipoLabel = VEICULO_TIPO_OPCOES.find((o) => o.value === ve.tipo)?.label;
              return (
                <li key={`${ve.placa}-${ve.nome}`}>
                  {ve.nome} — {ve.placa}
                  {tipoLabel ? ` (${tipoLabel})` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Tipo</dt>
          <dd className="text-slate-800">
            {viagem.tipo_trajeto === "ida"
              ? "Somente ida"
              : viagem.tipo_trajeto === "volta"
                ? "Somente volta"
                : "Ida e volta"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Peso / Valor mercadoria</dt>
          <dd className="text-slate-800">
            {viagem.peso_kg ? `${viagem.peso_kg} kg` : "—"} /{" "}
            {viagem.valor_mercadoria
              ? `R$ ${Number(viagem.valor_mercadoria).toLocaleString("pt-BR")}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Valor do frete</dt>
          <dd className="font-medium text-slate-900">
            {viagem.valor_frete != null
              ? `R$ ${Number(viagem.valor_frete).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Número do CTE</dt>
          <dd className="font-mono text-slate-800">{viagem.numero_cte ?? "—"}</dd>
        </div>
      </dl>

      <div>
        {fornecedores.length > 0 && (
          <>
            <p className="mb-1 text-sm font-medium text-slate-700">Fornecedores (origem)</p>
            <ul className="mb-3 ml-5 list-disc text-sm text-slate-600">
              {fornecedores.map((f) => (
                <li key={f.ordem}>
                  Fornecedor {f.ordem}: {f.local_fornecedor}
                  {viagem.fornecedor_atual_ordem === f.ordem && (
                    <span className="ml-1 font-medium text-violet-700">(atual)</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
          <MapPin className="h-4 w-4" /> Entregas
        </p>
        <ul className="ml-5 list-disc text-sm text-slate-600">
          {entregas.map((e) => (
            <li key={e.ordem}>
              Entrega {e.ordem}: {e.local_entrega}
              {viagem.entrega_atual_ordem === e.ordem && (
                <span className="ml-1 font-medium text-orange-700">(atual)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {viagem.descricao_mercadoria && (
        <p className="text-sm text-slate-600">
          <span className="text-slate-500">Mercadoria: </span>
          {viagem.descricao_mercadoria}
        </p>
      )}

      {anexos.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Anexos</h3>
          <ul className="space-y-1">
            {anexos.map((a) => (
              <AnexoRow
                key={a.id}
                anexo={a}
                onExcluido={() => setAnexos((prev) => prev.filter((x) => x.id !== a.id))}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ViagemCanhotos viagemId={viagemId} />
        <ViagemComprovantesDescarga viagemId={viagemId} />
      </div>

      <ViagemRecursos
        viagemId={viagemId}
        onRecursosChanged={() => {
          load();
          setRefreshKm((k) => k + 1);
        }}
      />

      <ViagemKmOdometro
        viagemId={viagemId}
        kmInicial={viagem.km_odometro_inicial}
        refreshKey={refreshKm}
      />
    </div>
  );
}

function AnexoRow({
  anexo,
  onExcluido,
}: {
  anexo: { id: string; categoria: string; file_name: string; storage_path: string };
  onExcluido: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function handleExcluir() {
    if (
      !(await mebConfirm(`Excluir o anexo "${anexo.file_name}"?`, {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindo(true);
    const err = await excluirAnexoTabela("viagem_anexos", anexo.id, anexo.storage_path);
    setExcluindo(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    onExcluido();
  }

  return (
    <li>
      <AnexoArquivoRow
        label={`${anexo.categoria}: ${anexo.file_name}`}
        storagePath={anexo.storage_path}
        onExcluir={handleExcluir}
        excluindo={excluindo}
      />
    </li>
  );
}
