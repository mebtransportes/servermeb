import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "success" | "secondary" | "modal" | "danger" | "ghost";
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition disabled:opacity-50",
        variant === "primary" &&
          "bg-slate-700 text-white hover:bg-slate-600",
        variant === "success" &&
          "bg-emerald-400 text-white hover:bg-emerald-500",
        variant === "secondary" &&
          "border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white",
        variant === "modal" &&
          "border border-slate-600 bg-slate-700 text-white hover:bg-slate-600",
        variant === "danger" &&
          "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        variant === "ghost" &&
          "text-slate-600 hover:bg-slate-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
