"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPinned, Printer } from "lucide-react";
import { ViagemDetail } from "@/components/operacional/viagem-detail";
import { ViagemAcompanhamentoCard } from "@/components/operacional/viagem-acompanhamento-card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  fetchClientesAcompanhamento,
  fetchViagensAcompanhamento,
  viagemMatchCliente,
  type AcompanhamentoViagemItem,
} from "@/lib/acompanhamento-data";
import { VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO } from "@/lib/viagem-validation";
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
  const [clientes, setClientes] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(statusUrl);
  const [filtroCliente, setFiltroCliente] = useState("");

  useEffect(() => {
    setFiltroStatus(statusUrl);
    setLoading(true);
  }, [statusUrl]);

  useEffect(() => {
    fetchClientesAcompanhamento().then(setClientes);
  }, []);

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
      if (filtroStatus && v.status !== filtroStatus) return false;
      if (filtroCliente && !viagemMatchCliente(v, filtroCliente)) return false;
      return true;
    });
  }, [viagens, filtroStatus, filtroCliente]);

  const excluirArquivadas = filtroStatus === "" && !filtroCliente;

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
          label="Cliente / local"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          options={[
            { value: "", label: "Todos os clientes" },
            ...clientes.map((nome) => ({ value: nome, label: nome })),
          ]}
          className="min-w-[240px]"
        />
      </div>

      {filtroCliente && (
        <p className="rounded-lg border border-cyan-800/40 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100 print:border-gray-400 print:bg-gray-50 print:text-black">
          Exibindo viagens relacionadas a <strong>{filtroCliente}</strong> (saída ou entrega).
          Todos os cards abaixo podem ser capturados em print para enviar à empresa.
        </p>
      )}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <p className="text-slate-500">Nenhuma viagem encontrada com os filtros selecionados.</p>
      ) : (
        <>
          <p className="text-sm text-slate-400 print:text-gray-600">
            {visiveis.length} viagem(ns) · clique em um card para editar detalhes
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((v) => (
              <ViagemAcompanhamentoCard
                key={v.id}
                viagem={v}
                clienteFiltro={filtroCliente}
                selected={selectedId === v.id}
                onSelect={() => setSelectedId((prev) => (prev === v.id ? null : v.id))}
                onEntregaAtualizada={load}
              />
            ))}
          </div>
        </>
      )}

      {selectedId && (
        <section className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-6 print:hidden">
          <h2 className="mb-4 text-lg font-semibold text-white">Detalhes e atualização</h2>
          <ViagemDetail viagemId={selectedId} onUpdated={load} />
        </section>
      )}
    </div>
  );
}
