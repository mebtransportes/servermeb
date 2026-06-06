"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MapPinned } from "lucide-react";
import { ViagemDetail } from "@/components/operacional/viagem-detail";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Viagem } from "@/types";
import { VIAGEM_STATUS } from "@/lib/viagem-validation";
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

  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [locaisSaida, setLocaisSaida] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(statusUrl);
  const [filtroLocalSaida, setFiltroLocalSaida] = useState("");

  useEffect(() => {
    setFiltroStatus(statusUrl);
    setLoading(true);
  }, [statusUrl]);

  useEffect(() => {
    async function loadLocais() {
      const supabase = createClient();
      const { data } = await supabase
        .from("viagens")
        .select("local_saida")
        .order("local_saida");
      const unicos = [
        ...new Set((data ?? []).map((r) => r.local_saida?.trim()).filter(Boolean)),
      ] as string[];
      setLocaisSaida(unicos);
    }
    loadLocais();
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("viagens")
      .select("*, motoristas(nome_completo), veiculos(nome, placa)")
      .order("created_at", { ascending: false });

    if (filtroStatus) {
      query = query.eq("status", filtroStatus);
    }
    if (filtroLocalSaida) {
      query = query.eq("local_saida", filtroLocalSaida);
    }

    const { data } = await query;
    setViagens((data as Viagem[]) ?? []);
    setLoading(false);
  }, [filtroStatus, filtroLocalSaida]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPinned className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Acompanhamento</h1>
            <p className="text-slate-400">Status e recursos das viagens</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Status do veículo"
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setLoading(true);
            }}
            options={[
              { value: "", label: "Todos os status" },
              ...VIAGEM_STATUS.map((s) => ({
                value: s,
                label: VIAGEM_STATUS_LABEL[s] ?? s,
              })),
            ]}
            className="min-w-[200px]"
          />
          <Select
            label="Local de saída"
            value={filtroLocalSaida}
            onChange={(e) => {
              setFiltroLocalSaida(e.target.value);
              setLoading(true);
            }}
            options={[
              { value: "", label: "Todos os locais" },
              ...locaisSaida.map((local) => ({ value: local, label: local })),
            ]}
            className="min-w-[220px]"
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-slate-400">Carregando...</p>
          ) : viagens.length === 0 ? (
            <p className="text-slate-500">Nenhuma viagem encontrada.</p>
          ) : (
            <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {viagens.map((v) => {
                const active = selectedId === v.id;
                const motorista = (v as Viagem & { motoristas?: { nome_completo: string } }).motoristas;
                const veiculo = (v as Viagem & { veiculos?: { placa: string; nome: string } }).veiculos;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition",
                        active
                          ? "border-cyan-500 bg-cyan-950/30"
                          : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                      )}
                    >
                      <p className="font-medium text-white">
                        {motorista?.nome_completo ?? "—"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {veiculo?.nome} · {veiculo?.placa}
                      </p>
                      <p className="mt-2 text-xs text-cyan-400">{v.status}</p>
                      <p className="text-xs text-slate-400 truncate" title={v.local_saida}>
                        Saída: {v.local_saida}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(v.saida_em).toLocaleDateString("pt-BR")}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-6 lg:col-span-3">
          {selectedId ? (
            <ViagemDetail viagemId={selectedId} onUpdated={load} />
          ) : (
            <p className="text-center text-slate-500 py-12">
              Selecione uma viagem para acompanhar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

