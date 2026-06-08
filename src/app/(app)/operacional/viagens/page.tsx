"use client";

import { useCallback, useEffect, useState } from "react";
import { Route, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViagemForm } from "@/components/operacional/viagem-form";
import {
  excluirViagem,
  fetchViagemParaEdicao,
  fetchViagensLista,
  type ViagemListItem,
  type ViagemParaEdicao,
} from "@/lib/viagem-crud";
import { formatarMoeda, formatarDataHoraBr } from "@/lib/frota-filters";
import { cn } from "@/lib/utils";

const statusCor: Record<string, string> = {
  "EM CARREGAMENTO": "bg-sky-900/50 text-sky-300",
  "EM ROTA": "bg-blue-900/50 text-blue-300",
  "EM MANUTENÇÃO": "bg-rose-900/50 text-rose-300",
  "AGUARDANDO DESCARGA": "bg-violet-900/50 text-violet-300",
  "DESCARGA EM ANDAMENTO": "bg-orange-900/50 text-orange-300",
  DESCARREGANDO: "bg-orange-900/50 text-orange-300",
  FINALIZADO: "bg-emerald-900/50 text-emerald-300",
  "PAGAMENTO PENDENTE": "bg-amber-900/50 text-amber-300",
  ARQUIVADO: "bg-slate-700/50 text-slate-400",
  "EM ANDAMENTO": "bg-blue-900/50 text-blue-300",
  "EM ATRASO": "bg-red-900/50 text-red-300",
};

export default function CadastroViagensPage() {
  const [lista, setLista] = useState<ViagemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ViagemParaEdicao | null>(null);
  const [msgSucesso, setMsgSucesso] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLista(await fetchViagensLista());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function abrirNova() {
    setEditing(null);
    setShowForm(true);
    setMsgSucesso("");
  }

  async function abrirEdicao(item: ViagemListItem) {
    const dados = await fetchViagemParaEdicao(item.id);
    if (!dados) {
      alert("Não foi possível carregar a viagem.");
      return;
    }
    setEditing(dados);
    setShowForm(true);
    setMsgSucesso("");
  }

  async function handleExcluir(item: ViagemListItem) {
    if (
      !confirm(
        `Excluir a viagem de ${item.motorista_nome} (${formatarDataHoraBr(item.saida_em)})? Todos os recursos e anexos vinculados serão removidos.`
      )
    ) {
      return;
    }
    const err = await excluirViagem(item.id);
    if (err) {
      alert(err);
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
    <div>
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
        <Button onClick={abrirNova}>
          <Plus className="h-4 w-4" />
          Nova viagem
        </Button>
      </header>

      {msgSucesso && (
        <p className="mb-4 rounded-lg bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
          {msgSucesso}
        </p>
      )}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-slate-500">Nenhuma viagem cadastrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Saída</th>
                <th className="px-4 py-3">Motorista</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">CTE</th>
                <th className="px-4 py-3">Frete</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id} className="border-t border-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatarDataHoraBr(v.saida_em)}
                  </td>
                  <td className="px-4 py-3">{v.motorista_nome}</td>
                  <td className="px-4 py-3">{v.veiculo_label}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{v.local_saida}</td>
                  <td className="px-4 py-3">{v.numero_cte ?? "—"}</td>
                  <td className="px-4 py-3">
                    {v.valor_frete != null ? formatarMoeda(Number(v.valor_frete)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        statusCor[v.status] ?? "bg-slate-700 text-slate-300"
                      )}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(v)}
                      className="mr-2 text-cyan-400 hover:text-cyan-300"
                      title="Editar"
                    >
                      <Pencil className="inline h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(v)}
                      className="text-red-400 hover:text-red-300"
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
      )}
    </div>
  );
}
