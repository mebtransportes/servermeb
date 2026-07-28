"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Route, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CadastroOpcaoAutocomplete } from "@/components/ui/cadastro-opcao-autocomplete";
import { ViagemForm } from "@/components/operacional/viagem-form";
import {
  excluirViagem,
  fetchViagemParaEdicao,
  fetchViagensLista,
  type ViagemListItem,
  type ViagemParaEdicao,
} from "@/lib/viagem-crud";
import {
  fetchFornecedoresAcompanhamento,
  viagemMatchFornecedorLocais,
} from "@/lib/acompanhamento-data";
import { formatarMoeda, formatarDataHoraBr } from "@/lib/frota-filters";
import { cn, mebCard } from "@/lib/utils";
import { VIAGEM_STATUS_CORES, VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO } from "@/lib/viagem-validation";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

export default function CadastroViagensPage() {
  const [lista, setLista] = useState<ViagemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ViagemParaEdicao | null>(null);
  const [msgSucesso, setMsgSucesso] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroFornecedorId, setFiltroFornecedorId] = useState("");
  const [buscaCte, setBuscaCte] = useState("");
  const [fornecedores, setFornecedores] = useState<
    Awaited<ReturnType<typeof fetchFornecedoresAcompanhamento>>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLista(await fetchViagensLista());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchFornecedoresAcompanhamento().then(setFornecedores);
  }, []);

  const fornecedorSelecionado = useMemo(
    () => fornecedores.find((f) => f.id === filtroFornecedorId),
    [fornecedores, filtroFornecedorId]
  );

  const filtradas = useMemo(() => {
    const cteQ = buscaCte.trim().toLowerCase();
    return lista.filter((v) => {
      if (filtroStatus) {
        const statusViagem =
          v.status === "DESCARREGANDO" ? "DESCARGA EM ANDAMENTO" : v.status;
        if (statusViagem !== filtroStatus) return false;
      }
      if (
        fornecedorSelecionado &&
        !viagemMatchFornecedorLocais(v.fornecedores, v.local_saida, fornecedorSelecionado)
      ) {
        return false;
      }
      if (cteQ && !(v.numero_cte ?? "").toLowerCase().includes(cteQ)) {
        return false;
      }
      return true;
    });
  }, [lista, filtroStatus, fornecedorSelecionado, buscaCte]);

  function abrirNova() {
    setEditing(null);
    setShowForm(true);
    setMsgSucesso("");
  }

  async function abrirEdicao(item: ViagemListItem) {
    const dados = await fetchViagemParaEdicao(item.id);
    if (!dados) {
      await mebAlert("Não foi possível carregar a viagem.");
      return;
    }
    setEditing(dados);
    setShowForm(true);
    setMsgSucesso("");
  }

  async function handleExcluir(item: ViagemListItem) {
    if (
      !(await mebConfirm(
        `Excluir a viagem de ${item.motorista_nome}${item.saida_em ? ` (${formatarDataHoraBr(item.saida_em)})` : " (agendada)"}? Todos os recursos e anexos vinculados serão removidos.`,
        { variant: "danger", confirmLabel: "Excluir" }
      ))
    ) {
      return;
    }
    const err = await excluirViagem(item.id);
    if (err) {
      await mebAlert(err);
      return;
    }
    if (editing?.id === item.id) {
      setShowForm(false);
      setEditing(null);
    }
    load();
  }

  if (showForm) {
    return (
      <div>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Route className="h-8 w-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold">
                {editing ? "Editar viagem" : "Nova viagem"}
              </h1>
              <p className="text-slate-400">
                {editing
                  ? "Alterações refletem em Acompanhamento e no fechamento, se finalizada"
                  : "Selecione motorista e veículo — só prossegue se estiverem aptos"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setShowForm(false);
              setEditing(null);
            }}
          >
            Voltar à lista
          </Button>
        </header>
        <ViagemForm
          viagem={editing ?? undefined}
          onSaved={() => {
            const eraEdicao = !!editing;
            setShowForm(false);
            setEditing(null);
            setMsgSucesso(eraEdicao ? "Viagem atualizada." : "Viagem cadastrada!");
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Route className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Cadastro de Viagens</h1>
            <p className="text-slate-400">
              Cadastre, edite ou exclua viagens · Acompanhe o status em Operacional
            </p>
          </div>
        </div>
        <Button variant="success" onClick={abrirNova}>
          <Plus className="h-4 w-4" />
          Nova viagem
        </Button>
      </header>

      {msgSucesso && (
        <p className="mb-4 rounded-lg bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
          {msgSucesso}
        </p>
      )}

      {!loading && lista.length > 0 && (
        <div className={`mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 ${mebCard}`}>
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
          />
          <CadastroOpcaoAutocomplete
            label="Fornecedor"
            options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
            value={filtroFornecedorId}
            onValueChange={setFiltroFornecedorId}
            opcional
            placeholder="Todos — digite o nome (mín. 2 letras)"
          />
          <Input
            label="CT-e"
            value={buscaCte}
            onChange={(e) => setBuscaCte(e.target.value)}
            placeholder="Nº CT-e..."
          />
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-slate-500">Nenhuma viagem cadastrada.</p>
      ) : filtradas.length === 0 ? (
        <p className="text-slate-500">Nenhuma viagem encontrada com os filtros selecionados.</p>
      ) : (
        <>
          {(filtroStatus || filtroFornecedorId || buscaCte.trim()) && (
            <p className="mb-3 text-sm text-slate-500">
              {filtradas.length} viagem(ns) encontrada(s)
              {filtroStatus && <> · {VIAGEM_STATUS_LABEL[filtroStatus] ?? filtroStatus}</>}
              {fornecedorSelecionado && <> · {fornecedorSelecionado.nome}</>}
              {buscaCte.trim() && <> · CT-e: {buscaCte.trim()}</>}
            </p>
          )}
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white/60">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-3 font-medium sm:px-3">Saída</th>
                <th className="px-2 py-3 font-medium sm:px-3">Motorista</th>
                <th className="px-2 py-3 font-medium sm:px-3">Veículo</th>
                <th className="px-2 py-3 font-medium sm:px-3">Origem / Destino</th>
                <th className="px-2 py-3 font-medium sm:px-3">CTE</th>
                <th className="px-2 py-3 font-medium sm:px-3">Frete</th>
                <th className="px-2 py-3 font-medium sm:px-3">Status</th>
                <th className="px-2 py-3 text-right font-medium sm:px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 hover:bg-white/50">
                  <td
                    className="px-2 py-3 sm:px-3"
                    title={v.saida_em ? formatarDataHoraBr(v.saida_em) : undefined}
                  >
                    <span className="line-clamp-2 break-words">
                      {v.saida_em ? formatarDataHoraBr(v.saida_em) : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-3 sm:px-3" title={v.motorista_nome}>
                    <span className="line-clamp-2 break-words">{v.motorista_nome}</span>
                  </td>
                  <td className="px-2 py-3 sm:px-3" title={v.veiculo_label}>
                    <span className="line-clamp-2 break-words">{v.veiculo_label}</span>
                  </td>
                  <td
                    className="px-2 py-3 sm:px-3"
                    title={v.origem_destino_label}
                  >
                    <span className="line-clamp-2 break-words">{v.origem_destino_label}</span>
                  </td>
                  <td className="truncate px-2 py-3 sm:px-3" title={v.numero_cte ?? undefined}>
                    {v.numero_cte ?? "—"}
                  </td>
                  <td className="truncate px-2 py-3 sm:px-3">
                    {v.valor_frete != null ? formatarMoeda(Number(v.valor_frete)) : "—"}
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <span
                      className={cn(
                        "meb-status-badge inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium",
                        VIAGEM_STATUS_CORES[v.status] ?? "bg-slate-100 text-slate-600"
                      )}
                      title={VIAGEM_STATUS_LABEL[v.status] ?? v.status}
                    >
                      {VIAGEM_STATUS_LABEL[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap sm:px-3">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(v)}
                      className="mr-1.5 text-cyan-600 hover:text-cyan-500"
                      title="Editar"
                    >
                      <Pencil className="inline h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(v)}
                      className="text-red-500 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="inline h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
