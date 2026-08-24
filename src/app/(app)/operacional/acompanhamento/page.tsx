"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, Filter, MapPinned } from "lucide-react";
import { ViagemAcompanhamentoCard } from "@/components/operacional/viagem-acompanhamento-card";
import { AcompanhamentoRelatorioModal } from "@/components/operacional/acompanhamento-relatorio-modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CadastroOpcaoAutocomplete } from "@/components/ui/cadastro-opcao-autocomplete";
import { Button } from "@/components/ui/button";
import {
  fetchClientesAcompanhamento,
  fetchFornecedoresAcompanhamento,
  fetchViagensAcompanhamento,
  viagemMatchCliente,
  viagemMatchFornecedor,
  type AcompanhamentoViagemItem,
} from "@/lib/acompanhamento-data";
import type { ParceiroSugestao } from "@/lib/parceiros";
import {
  isFrota,
  VINCULO_OPCOES,
  VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO,
} from "@/lib/viagem-validation";
import type { RecursoVinculo } from "@/types";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { cn, mebCard, mebFormSection } from "@/lib/utils";

export default function AcompanhamentoPage() {
  return (
    <Suspense
      fallback={
        <div className={cn(mebCard, "p-10 text-center text-sm text-slate-500")}>
          Carregando...
        </div>
      }
    >
      <AcompanhamentoContent />
    </Suspense>
  );
}

function AcompanhamentoContent() {
  const searchParams = useSearchParams();
  const statusUrl = searchParams.get("status") ?? "";

  const [viagens, setViagens] = useState<AcompanhamentoViagemItem[]>([]);
  const [fornecedores, setFornecedores] = useState<ParceiroSugestao[]>([]);
  const [clientes, setClientes] = useState<ParceiroSugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroVinculo, setFiltroVinculo] = useState<"" | RecursoVinculo>("");
  const [filtroStatus, setFiltroStatus] = useState(statusUrl);
  const [filtroFornecedorId, setFiltroFornecedorId] = useState("");
  const [filtroClienteId, setFiltroClienteId] = useState("");
  const [buscaCte, setBuscaCte] = useState("");
  const [showRelatorio, setShowRelatorio] = useState(false);

  useEffect(() => {
    setFiltroStatus(statusUrl);
    setLoading(true);
  }, [statusUrl]);

  useEffect(() => {
    fetchFornecedoresAcompanhamento().then(setFornecedores);
    fetchClientesAcompanhamento().then(setClientes);
  }, []);

  const fornecedorSelecionado = useMemo(
    () => fornecedores.find((f) => f.id === filtroFornecedorId),
    [fornecedores, filtroFornecedorId]
  );

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === filtroClienteId),
    [clientes, filtroClienteId]
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
    const cteQ = buscaCte.trim().toLowerCase();
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
      if (clienteSelecionado && !viagemMatchCliente(v, clienteSelecionado)) {
        return false;
      }
      if (cteQ && !(v.numero_cte ?? "").toLowerCase().includes(cteQ)) {
        return false;
      }
      return true;
    });
  }, [
    viagens,
    filtroVinculo,
    filtroStatus,
    fornecedorSelecionado,
    clienteSelecionado,
    buscaCte,
  ]);

  const excluirArquivadas =
    filtroVinculo === "" &&
    filtroStatus === "" &&
    !filtroFornecedorId &&
    !filtroClienteId &&
    !buscaCte.trim();

  const visiveis = useMemo(() => {
    if (!excluirArquivadas) return filtradas;
    return filtradas.filter((v) => v.status !== "ARQUIVADO");
  }, [filtradas, excluirArquivadas]);

  const temFiltros = !!(
    filtroVinculo ||
    filtroStatus ||
    filtroFornecedorId ||
    filtroClienteId ||
    buscaCte.trim()
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <MapPinned className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Acompanhamento
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Painel para acompanhar e compartilhar o andamento das viagens
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => setShowRelatorio(true)}>
          <FileDown className="h-4 w-4" />
          Gerar relatório
        </Button>
      </header>

      <div className={cn(mebFormSection, "space-y-0 print:hidden")}>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Filter className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Filtros</p>
            <p className="text-xs text-slate-500">
              Refine por vínculo, status, fornecedor, cliente ou CT-e
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="Vínculo"
            value={filtroVinculo}
            onChange={(e) => setFiltroVinculo(e.target.value as "" | RecursoVinculo)}
            options={[
              { value: "", label: "Todos (frota e terceiro)" },
              ...VINCULO_OPCOES.map((o) => ({ value: o.value, label: o.label })),
            ]}
            className="h-10"
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
            className="h-10"
          />
          <CadastroOpcaoAutocomplete
            label="Fornecedor"
            options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
            value={filtroFornecedorId}
            onValueChange={setFiltroFornecedorId}
            opcional
            placeholder="Todos — digite o nome (mín. 2 letras)"
          />
          <CadastroOpcaoAutocomplete
            label="Cliente"
            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
            value={filtroClienteId}
            onValueChange={setFiltroClienteId}
            minChars={4}
            opcional
            placeholder="Todos — digite o nome (mín. 4 letras)"
          />
          <Input
            label="CT-e"
            value={buscaCte}
            onChange={(e) => setBuscaCte(e.target.value)}
            placeholder="Nº CT-e..."
          />
        </div>
      </div>

      {(fornecedorSelecionado || clienteSelecionado) && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 print:border-gray-400 print:bg-gray-50 print:text-black">
          {fornecedorSelecionado && (
            <>
              Exibindo viagens que incluem <strong>{fornecedorSelecionado.nome}</strong> como
              fornecedor (origem).
            </>
          )}
          {fornecedorSelecionado && clienteSelecionado ? " " : null}
          {clienteSelecionado && (
            <>
              Exibindo viagens com destino para <strong>{clienteSelecionado.nome}</strong>.
            </>
          )}{" "}
          Nos cards com vários fornecedores ou entregas, selecione qual parada está ativa
          antes de copiar para o WhatsApp.
        </p>
      )}

      {loading ? (
        <div className={cn(mebCard, "p-10 text-center text-sm text-slate-500")}>
          Carregando viagens...
        </div>
      ) : visiveis.length === 0 ? (
        <div className={cn(mebCard, "border-dashed p-10 text-center")}>
          <MapPinned className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Nenhuma viagem encontrada
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ajuste os filtros ou aguarde novas viagens no período.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 print:text-gray-600">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {visiveis.length} viagem{visiveis.length === 1 ? "" : "s"}
                {temFiltros ? " filtrada(s)" : " ativas"}
              </p>
              <p className="text-xs text-slate-500">
                Selecione fornecedor/entrega atuais quando houver mais de um · use{" "}
                <strong className="font-medium text-slate-600">Copiar p/ WhatsApp</strong>{" "}
                para compartilhar
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-2">
            {visiveis.map((v) => (
              <ViagemAcompanhamentoCard key={v.id} viagem={v} onAtualizado={load} />
            ))}
          </div>
        </>
      )}

      <AcompanhamentoRelatorioModal
        viagens={viagens}
        fornecedores={fornecedores}
        open={showRelatorio}
        onClose={() => setShowRelatorio(false)}
      />
    </div>
  );
}
