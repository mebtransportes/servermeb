"use client";

import { useEffect, useRef, useState } from "react";
import {
  carregarParceiros,
  filtrarParceiros,
  type ParceiroSugestao,
} from "@/lib/parceiros";
import { cn } from "@/lib/utils";

type EntregaAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
};

export function EntregaAutocomplete({
  label,
  value,
  onChange,
  className,
  placeholder = "Digite o local ou nome do cliente/fornecedor",
  required,
}: EntregaAutocompleteProps) {
  const [parceiros, setParceiros] = useState<ParceiroSugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const sugestoes = filtrarParceiros(parceiros, value);

  useEffect(() => {
    carregarParceiros().then(setParceiros);
  }, []);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    setDestaque(0);
  }, [value, sugestoes.length]);

  function selecionar(item: ParceiroSugestao) {
    onChange(item.textoCompleto);
    setAberto(false);
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

  const mostrarLista = aberto && value.trim().length > 0 && sugestoes.length > 0;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1", className)}>
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      />

      {mostrarLista && (
        <ul
          className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl"
          role="listbox"
        >
          {sugestoes.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === destaque}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(item)}
                onMouseEnter={() => setDestaque(index)}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition",
                  index === destaque ? "bg-cyan-600/30" : "hover:bg-slate-800"
                )}
              >
                <span className="flex items-center gap-2 font-medium text-white">
                  {item.nome}
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      item.tipo === "cliente"
                        ? "bg-cyan-900/60 text-cyan-300"
                        : "bg-violet-900/60 text-violet-300"
                    )}
                  >
                    {item.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                  </span>
                </span>
                <span className="text-xs text-slate-400">{item.enderecoLinha}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto &&
        value.trim().length >= 2 &&
        sugestoes.length === 0 &&
        parceiros.length > 0 && (
          <p className="absolute top-full z-40 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-500 shadow-lg">
            Nenhum cliente ou fornecedor encontrado — continue digitando o local manualmente.
          </p>
        )}
    </div>
  );
}
