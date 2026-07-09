"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatKmBr, roundKm } from "@/lib/number-format";
import {
  calcularKmRodado,
  fetchKmInicialParaViagem,
  fetchUltimoKmAbastecimentoViagem,
  syncKmInicialAoAbrirViagem,
} from "@/lib/veiculo-km";
import { litrosAbastecimentoParaConsumo } from "@/lib/combustivel-consumo";
import {
  calcularConsumoKmLitro,
  formatConsumoKmLitro,
} from "@/types/fechamento";
import { Gauge } from "lucide-react";
import { mebFormSubsection } from "@/lib/utils";

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
  const [kmInicialExibido, setKmInicialExibido] = useState<number | null>(
    kmInicial != null ? roundKm(kmInicial) : null
  );

  useEffect(() => {
    let cancelado = false;

    async function carregarKm() {
      await syncKmInicialAoAbrirViagem(viagemId);
      const kmEsperado = await fetchKmInicialParaViagem(viagemId);

      if (cancelado) return;

      if (kmEsperado != null) {
        setKmInicialExibido(kmEsperado);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("viagens")
        .select("km_odometro_inicial")
        .eq("id", viagemId)
        .maybeSingle();

      if (cancelado) return;

      const kmDb =
        data?.km_odometro_inicial != null
          ? roundKm(Number(data.km_odometro_inicial))
          : null;
      setKmInicialExibido(kmDb ?? (kmInicial != null ? roundKm(kmInicial) : null));
    }

    void carregarKm();
    return () => {
      cancelado = true;
    };
  }, [viagemId, kmInicial, refreshKey]);

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
        return s + litrosAbastecimentoParaConsumo(r);
      }, 0);
      setLitrosAbastecidos(total);
    });
  }, [viagemId, refreshKey]);

  const kmRodado = useMemo(
    () => calcularKmRodado(kmInicialExibido, kmFinal),
    [kmInicialExibido, kmFinal]
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
        O KM inicial vem do último abastecimento da viagem anterior do mesmo cavalo. O KM
        final é preenchido automaticamente pelo último abastecimento registrado nos gastos
        desta viagem. O consumo é calculado: KM rodado ÷ litros de Diesel Aditivado, BS10,
        BS10 COMUM, S10 e S10 Aditivado (Arla, Diesel Comum e S500 não entram no cálculo).
      </p>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">KM inicial (odômetro saída)</dt>
          <dd className="font-medium text-slate-800">
            {kmInicialExibido != null ? formatKmBr(kmInicialExibido) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">KM final (último abastecimento)</dt>
          <dd className="font-medium text-slate-800">
            {kmFinal != null ? formatKmBr(kmFinal) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Litros para consumo (KM/L)</dt>
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
