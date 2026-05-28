import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AptoBadge({ apto, label }: { apto: boolean; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        apto ? "bg-emerald-950/60 text-emerald-400" : "bg-red-950/60 text-red-400"
      )}
    >
      {apto ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label ?? (apto ? "Apto" : "Inapto")}
    </span>
  );
}
