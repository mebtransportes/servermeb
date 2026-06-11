import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  tone?: "dark" | "light";
};

export function Textarea({
  label,
  tone = "light",
  className,
  id,
  ...props
}: TextareaProps) {
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
      <textarea
        id={inputId}
        className={cn(
          "min-h-[100px] rounded-lg border px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400",
          isLight
            ? "border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400"
            : "border-slate-200 bg-slate-800/80 text-white placeholder:text-slate-500",
          className
        )}
        {...props}
      />
    </div>
  );
}
