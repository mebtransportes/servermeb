"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ViagemStatusCards } from "@/components/dashboard/viagem-status-cards";
import { contarPorStatus, type ViagemResumo } from "@/lib/dashboard-viagens";

export default function DashboardPage() {
  const [viagens, setViagens] = useState<ViagemResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("viagens")
      .select("id, status, created_at")
      .order("created_at", { ascending: false });
    setViagens((data as ViagemResumo[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => contarPorStatus(viagens), [viagens]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Clique em um status para ver no acompanhamento
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Viagens por status
          </h2>
          <ViagemStatusCards counts={counts} />
        </section>
      )}
    </div>
  );
}
