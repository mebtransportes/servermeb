import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
  tone?: "dark" | "light";
};

export function Select({
  label,
  options,
  tone = "light",
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id || props.name;
  const isLight = tone === "light";
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "text-sm font-medium",
            isLight ? "text-slate-600" : "text-slate-300"
          )}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "rounded-lg border px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400",
          isLight
            ? "border-slate-200 bg-white/80 text-slate-900"
            : "border-slate-600 bg-slate-800/80 text-white",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
