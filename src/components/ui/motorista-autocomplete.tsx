"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Motorista } from "@/types";
import { labelVinculo } from "@/lib/viagem-validation";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;

const inputClass =
  "rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

type MotoristaAutocompleteProps = {
  label: string;
  motoristas: Motorista[];
  motoristaId: string;
  onMotoristaIdChange: (id: string) => void;
  required?: boolean;
  className?: string;
};

export function MotoristaAutocomplete({
  label,
  motoristas,
  motoristaId,
  onMotoristaIdChange,
  required,
  className,
}: MotoristaAutocompleteProps) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = motoristas.find((x) => x.id === motoristaId);
    if (m) setTexto(m.nome_completo);
    else if (!motoristaId) setTexto("");
  }, [motoristaId, motoristas]);

  const sugestoes = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (q.length < MIN_CHARS) return [];
    return motoristas
      .filter((m) => m.nome_completo.toLowerCase().includes(q))
      .slice(0, 8);
  }, [texto, motoristas]);

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

  function selecionar(m: Motorista) {
    onMotoristaIdChange(m.id);
    setTexto(m.nome_completo);
    setAberto(false);
  }

  function handleChange(val: string) {
    setTexto(val);
    setAberto(val.trim().length >= MIN_CHARS);
    const selecionado = motoristas.find((m) => m.id === motoristaId);
    if (selecionado && selecionado.nome_completo !== val) {
      onMotoristaIdChange("");
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

  const mostrarLista = aberto && texto.trim().length >= MIN_CHARS && sugestoes.length > 0;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1", className)}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={texto}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite o nome do motorista"
        required={required}
        autoComplete="off"
        className={inputClass}
      />

      {mostrarLista && (
        <ul
          className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {sugestoes.map((m, index) => (
            <li key={m.id} role="option" aria-selected={index === destaque}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(m)}
                onMouseEnter={() => setDestaque(index)}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition",
                  index === destaque ? "bg-emerald-50" : "hover:bg-slate-50"
                )}
              >
                <span className="font-medium text-slate-900">{m.nome_completo}</span>
                <span className="text-xs text-slate-500">{labelVinculo(m.vinculo)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
