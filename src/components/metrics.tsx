import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
export function Metric({
  label,
  value,
  detail,
  tone,
  icon = true,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative";
  icon?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {icon &&
          (tone === "positive" ? (
            <ArrowUpRight className="size-3.5 text-profit" />
          ) : tone === "negative" ? (
            <ArrowDownRight className="size-3.5 text-loss" />
          ) : (
            <Minus className="size-3 text-muted-foreground" />
          ))}
      </div>
      <p
        className={`tabular mt-4 text-[25px] font-medium tracking-[-1px] ${tone === "positive" ? "text-profit" : tone === "negative" ? "text-loss" : ""}`}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-3 text-[10px] text-muted-foreground">{detail}</p>
      )}
    </Card>
  );
}
