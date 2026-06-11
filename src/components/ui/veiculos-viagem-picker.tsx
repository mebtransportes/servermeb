"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Veiculo } from "@/types";
import { labelVinculo, VEICULO_TIPO_OPCOES } from "@/lib/viagem-validation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const MIN_CHARS = 2;

const inputClass =
  "rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

function normalizarPlaca(placa: string) {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

function labelTipoVeiculo(tipo: Veiculo["tipo"] | undefined) {
  return VEICULO_TIPO_OPCOES.find((o) => o.value === tipo)?.label ?? "";
}

type VeiculosViagemPickerProps = {
  veiculos: Veiculo[];
  veiculoIds: string[];
  onVeiculoIdsChange: (ids: string[]) => void;
};

export function VeiculosViagemPicker({
  veiculos,
  veiculoIds,
  onVeiculoIdsChange,
}: VeiculosViagemPickerProps) {
  const [placa, setPlaca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selecionados = useMemo(
    () =>
      veiculoIds
        .map((id) => veiculos.find((v) => v.id === id))
        .filter((v): v is Veiculo => !!v),
    [veiculoIds, veiculos]
  );

  const disponiveis = useMemo(
    () => veiculos.filter((v) => !veiculoIds.includes(v.id)),
    [veiculos, veiculoIds]
  );

  const sugestoes = useMemo(() => {
    const q = normalizarPlaca(placa);
    if (q.length < MIN_CHARS) return [];
    return disponiveis
      .filter((v) => normalizarPlaca(v.placa).includes(q))
      .slice(0, 8);
  }, [placa, disponiveis]);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    setDestaque(0);
  }, [placa, sugestoes.length]);

  function adicionar(v: Veiculo) {
    onVeiculoIdsChange([...veiculoIds, v.id]);
    setPlaca("");
    setAberto(false);
  }

  function remover(id: string) {
    onVeiculoIdsChange(veiculoIds.filter((x) => x !== id));
  }

  function handleChange(val: string) {
    setPlaca(val);
    setAberto(normalizarPlaca(val).length >= MIN_CHARS);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto || sugestoes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((i) => (i + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((i) => (i - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === "Enter" && sugestoes[destaque]) {
      e.preventDefault();
      adicionar(sugestoes[destaque]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  const queryOk = normalizarPlaca(placa).length >= MIN_CHARS;
  const mostrarLista = aberto && queryOk && sugestoes.length > 0;

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-600">
          Veículos da viagem (digite a placa)
        </label>
        <p className="text-xs text-slate-500">
          Adicione cavalo, carretas e demais veículos — um por vez pela placa.
        </p>
        <input
          type="text"
          value={placa}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: SCC2J60"
          autoComplete="off"
          className={inputClass}
        />

        {mostrarLista && (
          <ul
            className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {sugestoes.map((v, index) => {
              const tipoLabel = labelTipoVeiculo(v.tipo);
              return (
                <li key={v.id} role="option" aria-selected={index === destaque}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adicionar(v)}
                    onMouseEnter={() => setDestaque(index)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition",
                      index === destaque ? "bg-emerald-50" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="font-mono font-medium text-slate-900">{v.placa}</span>
                    <span className="text-xs text-slate-500">
                      {v.nome}
                      {tipoLabel ? ` · ${tipoLabel}` : ""} · {labelVinculo(v.vinculo)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {aberto && queryOk && sugestoes.length === 0 && disponiveis.length > 0 && (
          <p className="absolute top-full z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
            Nenhuma placa encontrada no cadastro.
          </p>
        )}
      </div>

      {selecionados.length > 0 ? (
        <ul className="space-y-2">
          {selecionados.map((v, index) => {
            const tipoLabel = labelTipoVeiculo(v.tipo);
            return (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <span className="font-mono font-semibold text-slate-900">{v.placa}</span>
                  <span className="ml-2 text-slate-700">{v.nome}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    ({labelVinculo(v.vinculo)}
                    {tipoLabel ? ` · ${tipoLabel}` : ""}
                    {index === 0 ? " · principal" : ""})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remover(v.id)}
                  title="Remover veículo"
                  className="shrink-0 rounded-md p-1.5 text-red-500 transition hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Nenhum veículo adicionado ainda.</p>
      )}
    </div>
  );
}
