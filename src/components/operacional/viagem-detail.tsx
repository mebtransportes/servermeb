"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ViagemRecursos } from "@/components/operacional/viagem-recursos";
import { VIAGEM_STATUS } from "@/lib/viagem-validation";
import { getFileUrl } from "@/lib/storage";
import type { Viagem, ViagemStatus } from "@/types";
import { FileText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";

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
};

export function ViagemDetail({
  viagemId,
  onUpdated,
}: {
  viagemId: string;
  onUpdated: () => void;
}) {
  const [viagem, setViagem] = useState<Viagem | null>(null);
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
      .select("*, motoristas(*), veiculos(*)")
      .eq("id", viagemId)
      .single();
    if (v) {
      setViagem(v as Viagem);
      setStatus(v.status);
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
    if (status === "FINALIZADO") {
      const err = await syncFechamentoViagem(viagemId);
      if (err) console.warn("Fechamento:", err);
    }
    setSaving(false);
    onUpdated();
    load();
  }

  if (!viagem) return <p className="text-slate-400">Carregando...</p>;

  const m = viagem.motoristas;
  const ve = viagem.veiculos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            {m?.nome_completo ?? "Motorista"} · {ve?.placa ?? "Veículo"}
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
      </div>

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
              <AnexoRow key={a.id} anexo={a} />
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
}: {
  anexo: { categoria: string; file_name: string; storage_path: string };
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getFileUrl(anexo.storage_path).then(setUrl);
  }, [anexo.storage_path]);

  return (
    <li className="flex items-center gap-2 text-sm">
      <FileText className="h-4 w-4 text-cyan-500" />
      <span className="text-slate-400">{anexo.categoria}:</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
          {anexo.file_name}
        </a>
      ) : (
        <span>{anexo.file_name}</span>
      )}
    </li>
  );
}
