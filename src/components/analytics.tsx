"use client";
import { useState } from "react";
import {
  summarize,
  analyze,
  rangeDates,
  filterRange,
  type Group,
} from "@/lib/analytics";
import { money, number, type Trade, type Settings } from "@/lib/calculations";
import { Card, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metrics";
import { Chart } from "@/components/charts";
import {
  DateFilter,
  initialRange,
  type DateRange,
} from "@/components/date-filter";
function GroupTable({
  title,
  groups,
  currency,
}: {
  title: string;
  groups: Group[];
  currency: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5">
        <CardTitle>{title}</CardTitle>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "Group",
                "Trades",
                "Win rate",
                "Net P&L",
                "Avg. P&L",
                "Avg. R",
                "Profit factor",
              ].map((s) => (
                <th key={s}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.name}>
                <td className="font-medium">{g.name}</td>
                <td>{g.total}</td>
                <td>{number(g.winRate, 1)}%</td>
                <td
                  className={`tabular ${g.net < 0 ? "text-loss" : "text-profit"}`}
                >
                  {money(g.net, currency)}
                </td>
                <td className="tabular">{money(g.expectancy, currency)}</td>
                <td>{g.averageR === null ? "—" : `${number(g.averageR)} R`}</td>
                <td>
                  {g.profitFactor === Infinity ? "∞" : number(g.profitFactor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!groups.length && (
          <p className="p-8 text-center text-xs text-muted-foreground">
            Not enough recorded data for this view yet.
          </p>
        )}
      </div>
    </Card>
  );
}
export function Analytics({
  trades,
  settings,
}: {
  trades: Trade[];
  settings: Settings;
}) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [tab, setTab] = useState("Profitability");
  const dates =
    range.preset === "Custom Date Range"
      ? range
      : rangeDates(range.preset, settings.timezone);
  const selected = filterRange(
    trades,
    settings.timezone,
    dates.start,
    dates.end,
  );
  const s = summarize(selected);
  const a = analyze(selected, settings.timezone);
  const cash = (v: number | null) => money(v, settings.currency);
  const rr = (v: number | null) => (v === null ? "—" : `${number(v)} R`);
  const table = (title: string, groups: Group[]) => (
    <GroupTable title={title} groups={groups} currency={settings.currency} />
  );
  const chart = (title: string, groups: Group[]) => (
    <Chart
      title={title}
      data={groups.map((g) => ({ name: g.name, value: g.net }))}
      currency={settings.currency}
    />
  );
  const hours = [...a.hour].sort((x, y) => y.net - x.net);
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">TURN OBSERVATIONS INTO UNDERSTANDING</p>
          <h1 className="page-title">Trading analytics</h1>
          <p className="page-description">
            Explore the patterns behind your results. All metrics use saved
            closed trades.
          </p>
        </div>
        <DateFilter range={range} setRange={setRange} />
      </div>
      <div
        role="tablist"
        aria-label="Analytics sections"
        className="mb-6 flex flex-wrap gap-1 border-b border-border"
      >
        {["Profitability", "Time", "Instruments", "Risk", "Discipline"].map(
          (name) => (
            <button
              key={name}
              role="tab"
              aria-selected={name === tab}
              aria-controls="analytics-panel"
              id={`tab-${name}`}
              className={`border-b-2 px-4 py-3 text-xs ${name === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ),
        )}
      </div>
      <div
        id="analytics-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="space-y-6"
      >
        {tab === "Profitability" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Gross P&L", cash(s.gross)],
                ["Net P&L", cash(s.net)],
                [
                  "Win rate",
                  s.winRate === null ? "—" : number(s.winRate, 1) + "%",
                ],
                [
                  "Profit factor",
                  s.profitFactor === Infinity ? "∞" : number(s.profitFactor),
                ],
                ["Average win", cash(s.averageWin)],
                ["Average loss", cash(s.averageLoss)],
                ["Average realized R", rr(s.averageR)],
                ["Expected value / trade", cash(s.expectancy)],
                ["Largest win", cash(s.largestWin)],
                ["Largest loss", cash(s.largestLoss)],
                ["Maximum drawdown", cash(s.maxDrawdown)],
                ["Closed trades", String(s.total)],
                ["Max consecutive wins", String(s.consecutiveWins)],
                ["Max consecutive losses", String(s.consecutiveLosses)],
              ].map(([label, value]) => (
                <Metric key={label} label={label} value={value} />
              ))}
            </div>
            <Chart
              title="Cumulative realized P&L"
              type="area"
              data={a.curve}
              currency={settings.currency}
            />
          </>
        )}
        {tab === "Time" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Average duration"
                value={
                  s.averageDuration === null
                    ? "—"
                    : `${number(s.averageDuration)} min`
                }
              />
              <Metric
                label="Best entry hour"
                value={hours[0]?.name || "—"}
                detail={hours[0] ? cash(hours[0].net) : "No closed trades"}
              />
              <Metric
                label="Worst entry hour"
                value={hours.at(-1)?.name || "—"}
                detail={
                  hours.at(-1) ? cash(hours.at(-1)!.net) : "No closed trades"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Weekday, hour, and session use entry time in {settings.timezone}.
              Monthly results use exit time. Session labels are local time
              windows.
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              {chart("Performance by weekday", a.weekday)}
              {chart("Performance by entry hour", a.hour)}
            </div>
            {table("Entry time windows", a.sessions)}
            {chart("Monthly results", a.monthly)}
            {table("Monthly detail", a.monthly)}
          </>
        )}
        {tab === "Instruments" && (
          <>
            {chart("Net P&L by instrument", a.instruments)}
            {table("Instrument comparison", a.instruments)}
          </>
        )}
        {tab === "Risk" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Average initial dollar risk"
                value={cash(s.averageRisk)}
              />
              <Metric label="Average realized R" value={rr(s.averageR)} />
              <Metric
                label="Average planned reward / risk"
                value={
                  s.plannedRR === null ? "—" : `${number(s.plannedRR)} : 1`
                }
              />
            </div>
            {table("Initial planned risk distribution", a.risk)}
            {table("Performance by contract quantity", a.quantity)}
            {table("Performance following consecutive losses", a.afterLoss)}
            <p className="text-[11px] text-muted-foreground">
              Risk statistics exclude trades without an initial stop. After-loss
              results use the chronological sequence of closed trades in the
              selected range.
            </p>
          </>
        )}
        {tab === "Discipline" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Trading plan adherence"
                value={
                  s.discipline === null ? "—" : `${number(s.discipline, 1)}%`
                }
                detail="Excludes unrecorded plan decisions"
              />
              <Metric
                label="Plan followed · net P&L"
                value={
                  a.plan.find((g) => g.name === "Plan followed")
                    ? cash(a.plan.find((g) => g.name === "Plan followed")!.net)
                    : "—"
                }
              />
              <Metric
                label="Plan not followed · net P&L"
                value={
                  a.plan.find((g) => g.name === "Plan not followed")
                    ? cash(
                        a.plan.find((g) => g.name === "Plan not followed")!.net,
                      )
                    : "—"
                }
              />
            </div>
            {table("Plan adherence comparison", a.plan)}
            {table("Most common mistakes · ordered by frequency", a.mistakes)}
            {table("Emotional state before entry", a.emotions)}
            {table(
              "Highest-activity days · inspect possible overtrading",
              [...a.daily].sort((x, y) => y.total - x.total).slice(0, 10),
            )}
            <p className="text-[11px] text-muted-foreground">
              Trade frequency alone does not determine overtrading. Review these
              days alongside your plan and recorded mistakes.
            </p>
          </>
        )}
      </div>
    </>
  );
}
