"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrNumberInput } from "@/components/ui/br-number-input";
import { Button } from "@/components/ui/button";
import { parseBrNumber, rawNumberStringToBrInput } from "@/lib/number-format";
import { calcularKmRodado } from "@/lib/veiculo-km";
import {
  calcularConsumoKmLitro,
  formatConsumoKmLitro,
} from "@/types/fechamento";
import { syncFechamentoViagem } from "@/lib/fechamento-viagem";
import { Gauge } from "lucide-react";
import { mebFormSubsection } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";

function isArlaCombustivel(tipo?: string | null) {
  return (tipo ?? "").trim().toLowerCase() === "arla";
}

export function ViagemKmOdometro({
  viagemId,
  kmInicial,
  kmFinalInicial,
  onSaved,
  refreshKey,
}: {
  viagemId: string;
  kmInicial?: number | null;
  kmFinalInicial?: number | null;
  onSaved: () => void;
  refreshKey?: number;
}) {
  const [kmFinal, setKmFinal] = useState("");
  const [litrosAbastecidos, setLitrosAbastecidos] = useState(0);
  const [saving, setSaving] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setKmFinal(
      kmFinalInicial != null
        ? rawNumberStringToBrInput(String(kmFinalInicial), 1)
        : ""
    );
  }, [kmFinalInicial]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("viagem_recursos")
      .select("litros, combustivel_tipo, tipo")
      .eq("viagem_id", viagemId)
      .eq("tipo", "abastecimento")
      .then(({ data }) => {
        const total = (data ?? []).reduce((s, r) => {
          if (isArlaCombustivel(r.combustivel_tipo)) return s;
          return s + (Number(r.litros) || 0);
        }, 0);
        setLitrosAbastecidos(total);
      });
  }, [viagemId, refreshKey]);

  const kmRodado = useMemo(
    () => calcularKmRodado(kmInicial, parseBrNumber(kmFinal)),
    [kmInicial, kmFinal]
  );

  const consumo = useMemo(
    () => calcularConsumoKmLitro(kmRodado, litrosAbastecidos),
    [kmRodado, litrosAbastecidos]
  );

  async function handleSalvar() {
    const final = parseBrNumber(kmFinal);
    if (final == null || final <= 0) {
      await mebAlert("Informe o odômetro final da rota.");
      return;
    }
    if (kmInicial != null && final < kmInicial) {
      await mebAlert("O KM final não pode ser menor que o KM inicial da viagem.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("viagens")
      .update({ km_odometro_final: final })
      .eq("id", viagemId);

    if (error) {
      await mebAlert(error.message);
      setSaving(false);
      return;
    }

    await syncFechamentoViagem(viagemId);
    setSaving(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
    onSaved();
  }

  return (
    <section className={mebFormSubsection}>
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-slate-400" />
        <h3 className="font-semibold text-slate-800">Quilometragem da rota</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Informe o odômetro ao final da rota. O consumo é calculado: KM rodado ÷ litros
        abastecidos nos gastos da viagem.
      </p>

      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">KM inicial (odômetro saída)</dt>
          <dd className="font-medium text-slate-800">
            {kmInicial != null ? kmInicial.toLocaleString("pt-BR") : "—"}
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
            {kmRodado != null ? kmRodado.toLocaleString("pt-BR") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Consumo médio</dt>
          <dd className="font-medium text-slate-800">{formatConsumoKmLitro(consumo)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-end gap-3">
        <BrNumberInput
          label="KM final da rota (odômetro)"
          decimalPlaces={1}
          value={kmFinal}
          onChange={setKmFinal}
          placeholder="Ex: 125.880"
        />
        <Button type="button" variant="success" onClick={handleSalvar} disabled={saving}>
          {saving ? "Salvando..." : "Salvar KM final"}
        </Button>
        {salvo && <span className="text-sm text-emerald-600">Salvo!</span>}
      </div>
    </section>
  );
}
