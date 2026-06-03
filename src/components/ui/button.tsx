import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
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
          "bg-cyan-600 text-white hover:bg-cyan-500",
        variant === "secondary" &&
          "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700",
        variant === "danger" &&
          "bg-red-600/90 text-white hover:bg-red-500",
        variant === "ghost" &&
          "text-slate-300 hover:bg-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
