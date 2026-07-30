import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary glow-ring">
        <ShieldCheck className="size-5" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Nexus<span className="text-primary">ID</span>
      </span>
    </div>
  );
}
