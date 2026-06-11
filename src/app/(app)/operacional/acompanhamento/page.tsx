"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPinned, Printer } from "lucide-react";
import { ViagemAcompanhamentoCard } from "@/components/operacional/viagem-acompanhamento-card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  fetchFornecedoresAcompanhamento,
  fetchViagensAcompanhamento,
  viagemMatchFornecedor,
  type AcompanhamentoViagemItem,
} from "@/lib/acompanhamento-data";
import type { ParceiroSugestao } from "@/lib/parceiros";
import { isFrota, VINCULO_OPCOES, VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO } from "@/lib/viagem-validation";
import type { RecursoVinculo } from "@/types";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";

export default function AcompanhamentoPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Carregando...</p>}>
      <AcompanhamentoContent />
    </Suspense>
  );
}

function AcompanhamentoContent() {
  const searchParams = useSearchParams();
  const statusUrl = searchParams.get("status") ?? "";

  const [viagens, setViagens] = useState<AcompanhamentoViagemItem[]>([]);
  const [fornecedores, setFornecedores] = useState<ParceiroSugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroVinculo, setFiltroVinculo] = useState<"" | RecursoVinculo>("");
  const [filtroStatus, setFiltroStatus] = useState(statusUrl);
  const [filtroFornecedorId, setFiltroFornecedorId] = useState("");

  useEffect(() => {
    setFiltroStatus(statusUrl);
    setLoading(true);
  }, [statusUrl]);

  useEffect(() => {
    fetchFornecedoresAcompanhamento().then(setFornecedores);
  }, []);

  const fornecedorSelecionado = useMemo(
    () => fornecedores.find((f) => f.id === filtroFornecedorId),
    [fornecedores, filtroFornecedorId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setViagens(await fetchViagensAcompanhamento());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtradas = useMemo(() => {
    return viagens.filter((v) => {
      if (filtroVinculo) {
        const frota = isFrota(v.motorista_vinculo);
        if (filtroVinculo === "frota" && !frota) return false;
        if (filtroVinculo === "terceiro" && frota) return false;
      }
      if (filtroStatus) {
        const statusViagem =
          v.status === "DESCARREGANDO" ? "DESCARGA EM ANDAMENTO" : v.status;
        if (statusViagem !== filtroStatus) return false;
      }
      if (fornecedorSelecionado && !viagemMatchFornecedor(v, fornecedorSelecionado)) {
        return false;
      }
      return true;
    });
  }, [viagens, filtroVinculo, filtroStatus, fornecedorSelecionado]);

  const excluirArquivadas =
    filtroVinculo === "" && filtroStatus === "" && !filtroFornecedorId;

  const visiveis = useMemo(() => {
    if (!excluirArquivadas) return filtradas;
    return filtradas.filter((v) => v.status !== "ARQUIVADO");
  }, [filtradas, excluirArquivadas]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <MapPinned className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Acompanhamento</h1>
            <p className="text-slate-400">
              Painel completo para acompanhar e compartilhar o andamento das viagens
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / print
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/50 bg-slate-800/20 p-4 print:hidden">
        <Select
          label="Vínculo"
          value={filtroVinculo}
          onChange={(e) => setFiltroVinculo(e.target.value as "" | RecursoVinculo)}
          options={[
            { value: "", label: "Todos (frota e terceiro)" },
            ...VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label })),
          ]}
          className="min-w-[220px]"
        />
        <Select
          label="Status"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          options={[
            { value: "", label: "Todos os status" },
            ...VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO.map((s) => ({
              value: s,
              label: VIAGEM_STATUS_LABEL[s] ?? s,
            })),
          ]}
          className="min-w-[200px]"
        />
        <Select
          label="Fornecedor"
          value={filtroFornecedorId}
          onChange={(e) => setFiltroFornecedorId(e.target.value)}
          options={[
            { value: "", label: "Todos os fornecedores" },
            ...fornecedores.map((f) => ({
              value: f.id,
              label: f.nome,
            })),
          ]}
          className="min-w-[240px]"
        />
      </div>

      {fornecedorSelecionado && (
        <p className="rounded-lg border border-cyan-800/40 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100 print:border-gray-400 print:bg-gray-50 print:text-black">
          Exibindo viagens que incluem <strong>{fornecedorSelecionado.nome}</strong> como
          fornecedor (origem). Nos cards com vários fornecedores ou entregas, selecione qual
          parada está ativa antes de copiar para o WhatsApp ou tirar print.
        </p>
      )}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <p className="text-slate-500">Nenhuma viagem encontrada com os filtros selecionados.</p>
      ) : (
        <>
          <p className="text-sm text-slate-400 print:text-gray-600">
            {visiveis.length} viagem(ns) · selecione fornecedor/entrega atuais quando houver
            mais de um · <strong>Copiar p/ WhatsApp</strong> ou imprima a tela
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-2">
            {visiveis.map((v) => (
              <ViagemAcompanhamentoCard
                key={v.id}
                viagem={v}
                onAtualizado={load}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
}
