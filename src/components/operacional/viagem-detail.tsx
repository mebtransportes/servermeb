"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ViagemRecursos } from "@/components/operacional/viagem-recursos";
import { VIAGEM_STATUS } from "@/lib/viagem-validation";
import { excluirAnexoTabela } from "@/lib/anexos-crud";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import type { Viagem, ViagemStatus } from "@/types";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { statusGeraFechamento } from "@/lib/viagem-status";
import { formatarVeiculosLabel } from "@/lib/viagem-crud";
import { VEICULO_TIPO_OPCOES } from "@/lib/viagem-validation";
import type { Veiculo } from "@/types";

const statusColors: Record<string, string> = {
  "EM ANDAMENTO": "bg-blue-900/50 text-blue-300",
  "EM CARREGAMENTO": "bg-amber-900/50 text-amber-300",
  "EM ROTA": "bg-cyan-900/50 text-cyan-300",
  "CHEGOU AO DESTINO DE ENTREGA": "bg-purple-900/50 text-purple-300",
  "CHEGOU AO DESTINO FINAL": "bg-indigo-900/50 text-indigo-300",
  DESCARREGANDO: "bg-orange-900/50 text-orange-300",
  "PARADO NA ESTRADA": "bg-red-900/50 text-red-300",
  "EM ATRASO": "bg-rose-900/50 text-rose-300",
  FINALIZADO: "bg-emerald-900/50 text-emerald-300",
  "PAGAMENTO PENDENTE": "bg-amber-900/50 text-amber-300",
  ARQUIVADO: "bg-slate-700/50 text-slate-400",
};

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
  const [entregas, setEntregas] = useState<{ local_entrega: string; ordem: number }[]>([]);
  const [anexos, setAnexos] = useState<
    { id: string; categoria: string; file_name: string; storage_path: string }[]
  >([]);
  const [status, setStatus] = useState<ViagemStatus>("EM ANDAMENTO");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = createClient();
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

    const { data: e } = await supabase
      .from("viagem_entregas")
      .select("local_entrega, ordem")
      .eq("viagem_id", viagemId)
      .order("ordem");
    setEntregas(e ?? []);

    const { data: a } = await supabase
      .from("viagem_anexos")
      .select("id, categoria, file_name, storage_path")
      .eq("viagem_id", viagemId)
      .is("recurso_id", null);
    setAnexos(a ?? []);
  };

  useEffect(() => {
    load();
  }, [viagemId]);

  async function saveStatus() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("viagens").update({ status }).eq("id", viagemId);
    if (statusGeraFechamento(status)) {
      const err = await syncFechamentoViagem(viagemId);
      if (err) console.warn("Fechamento:", err);
    }
    setSaving(false);
    onUpdated();
    load();
  }

  if (!viagem) return <p className="text-slate-400">Carregando...</p>;

  const m = viagem.motoristas;
  const veiculosLabel = formatarVeiculosLabel(veiculosViagem);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            {m?.nome_completo ?? "Motorista"} · {veiculosLabel}
          </h2>
          <p className="text-sm text-slate-400">
            Saída: {new Date(viagem.saida_em).toLocaleString("pt-BR")}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            statusColors[viagem.status] ?? "bg-slate-800 text-slate-300"
          )}
        >
          {viagem.status}
        </span>
      </div>

      <div className="rounded-xl border border-slate-700/50 p-4">
        <h3 className="mb-3 font-semibold text-cyan-400">Atualizar status</h3>
        <div className="flex flex-wrap gap-3">
          <Select
            label="Status da viagem"
            value={status}
            onChange={(e) => setStatus(e.target.value as ViagemStatus)}
            options={VIAGEM_STATUS.map((s) => ({ value: s, label: s }))}
          />
          <Button
            type="button"
            onClick={saveStatus}
            disabled={saving || status === viagem.status}
            className="self-end"
          >
            {saving ? "Salvando..." : "Salvar status"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          <strong className="text-slate-400">Finalizado</strong> e{" "}
          <strong className="text-slate-400">Pagamento pendente</strong> aparecem no Fechamento de
          viagens. <strong className="text-slate-400">Arquivado</strong> remove do fechamento
          (comissão já paga).
        </p>
      </div>

      {veiculosViagem.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Veículos</h3>
          <ul className="space-y-1 text-sm text-slate-400">
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
          <dt className="text-slate-500">Chegada prevista</dt>
          <dd>{new Date(viagem.chegada_prevista_em).toLocaleString("pt-BR")}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Tipo</dt>
          <dd>
            {viagem.tipo_trajeto === "ida"
              ? "Somente ida"
              : viagem.tipo_trajeto === "volta"
                ? "Somente volta"
                : "Ida e volta"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">KM total</dt>
          <dd>{viagem.km_total ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Peso / Valor mercadoria</dt>
          <dd>
            {viagem.peso_kg ? `${viagem.peso_kg} kg` : "—"} /{" "}
            {viagem.valor_mercadoria
              ? `R$ ${Number(viagem.valor_mercadoria).toLocaleString("pt-BR")}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Valor do frete</dt>
          <dd className="font-medium text-emerald-400">
            {viagem.valor_frete != null
              ? `R$ ${Number(viagem.valor_frete).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Número do CTE</dt>
          <dd className="font-mono text-cyan-300">{viagem.numero_cte ?? "—"}</dd>
        </div>
      </dl>

      <div>
        <p className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-300">
          <MapPin className="h-4 w-4" /> Saída: {viagem.local_saida}
        </p>
        <ul className="ml-5 list-disc text-sm text-slate-400">
          {entregas.map((e) => (
            <li key={e.ordem}>
              Entrega {e.ordem}: {e.local_entrega}
            </li>
          ))}
        </ul>
      </div>

      {viagem.descricao_mercadoria && (
        <p className="text-sm text-slate-300">
          <span className="text-slate-500">Mercadoria: </span>
          {viagem.descricao_mercadoria}
        </p>
      )}

      {anexos.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Anexos</h3>
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

      <ViagemRecursos viagemId={viagemId} />
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
    if (!confirm(`Excluir o anexo "${anexo.file_name}"?`)) return;
    setExcluindo(true);
    const err = await excluirAnexoTabela("viagem_anexos", anexo.id, anexo.storage_path);
    setExcluindo(false);
    if (err) {
      alert(err);
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
