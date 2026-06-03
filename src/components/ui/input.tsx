import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  /** Fundo claro (ex.: card de login cinza gelo). */
  tone?: "dark" | "light";
};

export function Input({
  label,
  error,
  tone = "dark",
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || props.name;
  const isLight = tone === "light";
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium",
            isLight ? "text-slate-700" : "text-slate-300"
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "rounded-lg border px-3 py-2.5 text-base focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500",
          isLight
            ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
            : "border-slate-600 bg-slate-800/80 text-white placeholder:text-slate-500",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && (
        <span className={cn("text-xs", isLight ? "text-red-600" : "text-red-400")}>
          {error}
        </span>
      )}
    </div>
  );
}
