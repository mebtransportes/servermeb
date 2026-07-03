"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatKmBr } from "@/lib/number-format";
import { calcularKmRodado, fetchUltimoKmAbastecimentoViagem } from "@/lib/veiculo-km";
import {
  calcularConsumoKmLitro,
  formatConsumoKmLitro,
} from "@/types/fechamento";
import { Gauge } from "lucide-react";
import { mebFormSubsection } from "@/lib/utils";

function isArlaCombustivel(tipo?: string | null) {
  return (tipo ?? "").trim().toLowerCase() === "arla";
}

export function ViagemKmOdometro({
  viagemId,
  kmInicial,
  refreshKey,
}: {
  viagemId: string;
  kmInicial?: number | null;
  refreshKey?: number;
}) {
  const [kmFinal, setKmFinal] = useState<number | null>(null);
  const [litrosAbastecidos, setLitrosAbastecidos] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      fetchUltimoKmAbastecimentoViagem(viagemId),
      supabase
        .from("viagem_recursos")
        .select("litros, combustivel_tipo, tipo")
        .eq("viagem_id", viagemId)
        .eq("tipo", "abastecimento"),
    ]).then(([ultimoKm, { data }]) => {
      setKmFinal(ultimoKm);
      const total = (data ?? []).reduce((s, r) => {
        if (isArlaCombustivel(r.combustivel_tipo)) return s;
        return s + (Number(r.litros) || 0);
      }, 0);
      setLitrosAbastecidos(total);
    });
  }, [viagemId, refreshKey]);

  const kmRodado = useMemo(
    () => calcularKmRodado(kmInicial, kmFinal),
    [kmInicial, kmFinal]
  );

  const consumo = useMemo(
    () => calcularConsumoKmLitro(kmRodado, litrosAbastecidos),
    [kmRodado, litrosAbastecidos]
  );

  return (
    <section className={mebFormSubsection}>
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-slate-400" />
        <h3 className="font-semibold text-slate-800">Quilometragem da rota</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        O KM final é preenchido automaticamente pelo último abastecimento registrado nos gastos
        desta viagem. O consumo é calculado: KM rodado ÷ litros abastecidos na viagem.
      </p>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">KM inicial (odômetro saída)</dt>
          <dd className="font-medium text-slate-800">
            {kmInicial != null ? formatKmBr(kmInicial) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">KM final (último abastecimento)</dt>
          <dd className="font-medium text-slate-800">
            {kmFinal != null ? formatKmBr(kmFinal) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Litros abastecidos na viagem</dt>
          <dd className="font-medium text-slate-800">
            {litrosAbastecidos > 0
              ? `${litrosAbastecidos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} L`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">KM rodado</dt>
          <dd className="font-medium text-slate-800">
            {kmRodado != null ? formatKmBr(kmRodado) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Consumo médio</dt>
          <dd className="font-medium text-slate-800">{formatConsumoKmLitro(consumo)}</dd>
        </div>
      </dl>
    </section>
  );
}
