"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  carregarParceiros,
  filtrarParceiros,
  type ParceiroSugestao,
} from "@/lib/parceiros";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;

const inputClass =
  "rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

type EntregaAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  tipoParceiro?: "cliente" | "fornecedor" | "todos";
};

export function EntregaAutocomplete({
  label,
  value,
  onChange,
  className,
  placeholder = "Digite o local ou nome",
  required,
  tipoParceiro = "todos",
}: EntregaAutocompleteProps) {
  const [parceiros, setParceiros] = useState<ParceiroSugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const parceirosFiltrados = useMemo(() => {
    if (tipoParceiro === "todos") return parceiros;
    return parceiros.filter((p) => p.tipo === tipoParceiro);
  }, [parceiros, tipoParceiro]);

  const sugestoes = filtrarParceiros(parceirosFiltrados, value);

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

  const queryOk = value.trim().length >= MIN_CHARS;
  const mostrarLista = aberto && queryOk && sugestoes.length > 0;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1", className)}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val);
          setAberto(val.trim().length >= MIN_CHARS);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={inputClass}
      />

      {mostrarLista && (
        <ul
          className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
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
                  index === destaque ? "bg-emerald-50" : "hover:bg-slate-50"
                )}
              >
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  {item.nome}
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      item.tipo === "cliente"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-violet-100 text-violet-700"
                    )}
                  >
                    {item.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                  </span>
                </span>
                <span className="text-xs text-slate-500">{item.enderecoLinha}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && queryOk && sugestoes.length === 0 && parceirosFiltrados.length > 0 && (
        <p className="absolute top-full z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          Nenhum cadastro encontrado — continue digitando o local manualmente.
        </p>
      )}
    </div>
  );
}
