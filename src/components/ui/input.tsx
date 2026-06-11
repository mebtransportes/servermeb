import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  /** Fundo escuro (ex.: modais). */
  tone?: "dark" | "light";
};

export function Input({
  label,
  error,
  tone = "light",
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
            isLight ? "text-slate-600" : "text-slate-300"
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "rounded-lg border px-3 py-2.5 text-base focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400",
          isLight
            ? "border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400"
            : "border-slate-600 bg-slate-800/80 text-white placeholder:text-slate-500",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && (
        <span className={cn("text-xs", isLight ? "text-slate-600" : "text-red-400")}>
          {error}
        </span>
      )}
    </div>
  );
}
