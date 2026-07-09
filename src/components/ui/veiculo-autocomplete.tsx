"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizarPlaca } from "@/lib/cadastro-busca";
import { labelVinculo, VEICULO_TIPO_OPCOES } from "@/lib/viagem-validation";
import { cn } from "@/lib/utils";
import type { RecursoVinculo, VeiculoTipo } from "@/types";

const MIN_CHARS_PLACA = 2;

const inputClass =
  "rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

export type VeiculoOption = {
  id: string;
  nome: string;
  placa: string;
  tipo?: VeiculoTipo | null;
  vinculo?: RecursoVinculo | null;
};

function labelTipoVeiculo(tipo: VeiculoTipo | null | undefined) {
  return VEICULO_TIPO_OPCOES.find((o) => o.value === tipo)?.label ?? "";
}

type VeiculoAutocompleteProps = {
  label: string;
  veiculos: VeiculoOption[];
  veiculoId: string;
  onVeiculoIdChange: (id: string) => void;
  required?: boolean;
  opcional?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  hint?: string;
};

export function VeiculoAutocomplete({
  label,
  veiculos,
  veiculoId,
  onVeiculoIdChange,
  required,
  opcional,
  disabled,
  className,
  placeholder = "Digite a placa (mín. 2 caracteres)",
  hint,
}: VeiculoAutocompleteProps) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = veiculos.find((x) => x.id === veiculoId);
    if (v) setTexto(v.placa);
    else if (!veiculoId) setTexto("");
  }, [veiculoId, veiculos]);

  const sugestoes = useMemo(() => {
    const q = normalizarPlaca(texto);
    if (q.length < MIN_CHARS_PLACA) return [];
    return veiculos
      .filter((v) => normalizarPlaca(v.placa).includes(q))
      .slice(0, 8);
  }, [texto, veiculos]);

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
  }, [texto, sugestoes.length]);

  function selecionar(v: VeiculoOption) {
    onVeiculoIdChange(v.id);
    setTexto(v.placa);
    setAberto(false);
  }

  function handleChange(val: string) {
    setTexto(val);
    setAberto(normalizarPlaca(val).length >= MIN_CHARS_PLACA);
    const selecionado = veiculos.find((v) => v.id === veiculoId);
    if (selecionado && normalizarPlaca(selecionado.placa) !== normalizarPlaca(val)) {
      onVeiculoIdChange("");
    }
    if (opcional && !val.trim()) {
      onVeiculoIdChange("");
      setAberto(false);
    }
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
      selecionar(sugestoes[destaque]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  const queryOk = normalizarPlaca(texto).length >= MIN_CHARS_PLACA;
  const mostrarLista = aberto && queryOk && sugestoes.length > 0 && !disabled;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1", className)}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={texto}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={inputClass}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}

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
                  onClick={() => selecionar(v)}
                  onMouseEnter={() => setDestaque(index)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition",
                    index === destaque ? "bg-emerald-50" : "hover:bg-slate-50"
                  )}
                >
                  <span className="font-mono font-medium text-slate-900">{v.placa}</span>
                  <span className="text-xs text-slate-500">
                    {v.nome}
                    {tipoLabel ? ` · ${tipoLabel}` : ""}
                    {v.vinculo ? ` · ${labelVinculo(v.vinculo)}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {aberto && queryOk && sugestoes.length === 0 && veiculos.length > 0 && !disabled && (
        <p className="absolute top-full z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          Nenhuma placa encontrada no cadastro.
        </p>
      )}
    </div>
  );
}
