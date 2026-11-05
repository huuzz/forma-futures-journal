"use client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/calculations";
export function Chart({
  title,
  subtitle,
  data,
  type = "bar",
  currency = "USD",
  height = 240,
}: {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
  type?: "area" | "bar" | "pie";
  currency?: string;
  height?: number;
}) {
  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--foreground)",
  };
  return (
    <Card className="min-w-0">
      <CardTitle>{title}</CardTitle>
      {subtitle && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-6" style={{ height }}>
        {!data.length ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40">
            <span
              className="mb-3 flex h-12 items-end gap-1.5 opacity-40"
              aria-hidden="true"
            >
              {[18, 30, 24, 42, 35, 48, 40].map((h, i) => (
                <span
                  key={i}
                  style={{ height: h }}
                  className="w-2 rounded-t bg-primary/50"
                />
              ))}
            </span>
            <p className="text-xs text-muted-foreground">
              Your results will take shape here.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Save a closed trade to start.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "pie" ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="85%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((d, i) => (
                    <Cell
                      key={d.name}
                      fill={
                        [
                          "var(--profit)",
                          "var(--loss)",
                          "var(--muted-foreground)",
                        ][i % 3]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            ) : type === "area" ? (
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={35}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => money(Number(v), currency)}
                />
                <Area
                  type="linear"
                  dataKey="value"
                  name="Realized P&L"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#pnlFill)"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => money(Number(v), currency)}
                />
                <Bar
                  dataKey="value"
                  name="Net P&L"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={36}
                >
                  {data.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.value < 0 ? "var(--loss)" : "var(--profit)"}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
