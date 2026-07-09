"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizarBusca } from "@/lib/cadastro-busca";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

export type OpcaoAutocompleteItem = {
  value: string;
  label: string;
};

type CadastroOpcaoAutocompleteProps = {
  label: string;
  options: OpcaoAutocompleteItem[];
  value: string;
  onValueChange: (value: string) => void;
  minChars?: number;
  opcional?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  hint?: string;
  nenhumEncontrado?: string;
};

export function CadastroOpcaoAutocomplete({
  label,
  options,
  value,
  onValueChange,
  minChars = 2,
  opcional,
  required,
  disabled,
  className,
  placeholder,
  hint,
  nenhumEncontrado = "Nenhum resultado encontrado.",
}: CadastroOpcaoAutocompleteProps) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selecionado = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  useEffect(() => {
    if (selecionado) {
      setTexto(selecionado.label);
    } else if (!value) {
      setTexto("");
    }
  }, [value, selecionado]);

  const sugestoes = useMemo(() => {
    const q = texto.trim();
    if (q.length < minChars) return [];
    const nq = normalizarBusca(q);
    return options
      .filter((o) => o.value && normalizarBusca(o.label).includes(nq))
      .slice(0, 8);
  }, [texto, options, minChars]);

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

  function selecionar(item: OpcaoAutocompleteItem) {
    onValueChange(item.value);
    setTexto(item.label);
    setAberto(false);
  }

  function handleChange(val: string) {
    setTexto(val);
    setAberto(val.trim().length >= minChars);
    if (selecionado && selecionado.label !== val) {
      onValueChange("");
    }
    if (opcional && !val.trim()) {
      onValueChange("");
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

  const queryOk = texto.trim().length >= minChars;
  const mostrarLista = aberto && queryOk && sugestoes.length > 0 && !disabled;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1", className)}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={texto}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ??
          `Digite para buscar (mín. ${minChars} letra${minChars === 1 ? "" : "s"})`
        }
        required={required && !value}
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
          {sugestoes.map((item, index) => (
            <li key={item.value} role="option" aria-selected={index === destaque}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(item)}
                onMouseEnter={() => setDestaque(index)}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm transition",
                  index === destaque ? "bg-emerald-50" : "hover:bg-slate-50"
                )}
              >
                <span className="font-medium text-slate-900">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && queryOk && sugestoes.length === 0 && options.length > 0 && !disabled && (
        <p className="absolute top-full z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          {nenhumEncontrado}
        </p>
      )}
    </div>
  );
}
