"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizarPlaca } from "@/lib/cadastro-busca";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

type PlacaRelatorioAutocompleteProps = {
  label: string;
  placas: string[];
  value: string;
  onChange: (placa: string) => void;
  onTextoChange?: (texto: string) => void;
  placeholder?: string;
  hint?: string;
};

export function PlacaRelatorioAutocomplete({
  label,
  placas,
  value,
  onChange,
  onTextoChange,
  placeholder = "Digite a placa (mín. 2 caracteres)",
  hint,
}: PlacaRelatorioAutocompleteProps) {
  const [texto, setTexto] = useState(value);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTexto(value);
  }, [value]);

  const sugestoes = useMemo(() => {
    const q = normalizarPlaca(texto);
    if (q.length < MIN_CHARS) return [];
    return placas.filter((p) => normalizarPlaca(p).includes(q)).slice(0, 8);
  }, [texto, placas]);

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

  function selecionar(placa: string) {
    onChange(placa);
    setTexto(placa);
    setAberto(false);
  }

  function handleChange(val: string) {
    setTexto(val);
    onTextoChange?.(val);
    setAberto(normalizarPlaca(val).length >= MIN_CHARS);
    if (value && normalizarPlaca(value) !== normalizarPlaca(val)) {
      onChange("");
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

  const queryOk = normalizarPlaca(texto).length >= MIN_CHARS;
  const mostrarLista = aberto && queryOk && sugestoes.length > 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={texto}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClass}
        />

        {mostrarLista && (
          <ul
            className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {sugestoes.map((placa, index) => (
              <li key={placa} role="option" aria-selected={index === destaque}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionar(placa)}
                  onMouseEnter={() => setDestaque(index)}
                  className={cn(
                    "w-full px-3 py-2 text-left font-mono text-sm transition",
                    index === destaque ? "bg-cyan-50 text-cyan-900" : "text-slate-800 hover:bg-slate-50"
                  )}
                >
                  {placa}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
