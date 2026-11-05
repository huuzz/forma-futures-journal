"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Target, Flame, CalendarDays } from "lucide-react";
import { summarize, analyze, filterRange, rangeDates } from "@/lib/analytics";
import { money, number, type Trade, type Settings } from "@/lib/calculations";
import { dayKey } from "@/lib/dates";
import { Metric } from "@/components/metrics";
import { Chart } from "@/components/charts";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradeHistory } from "@/components/trade-history";
import {
  DateFilter,
  initialRange,
  type DateRange,
} from "@/components/date-filter";
export function Dashboard({
  trades,
  settings,
}: {
  trades: Trade[];
  settings: Settings;
}) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const bounds =
    range.preset === "Custom Date Range"
      ? range
      : rangeDates(range.preset, settings.timezone);
  const selected = filterRange(
    trades,
    settings.timezone,
    bounds.start,
    bounds.end,
  );
  const s = summarize(selected);
  const a = analyze(selected, settings.timezone);
  const today = dayKey(new Date(), settings.timezone);
  const daily = a.daily.find((d) => d.name === today);
  const best = [...a.daily].sort((a, b) => b.net - a.net)[0];
  const worst = [...a.daily].sort((a, b) => a.net - b.net)[0];
  const periodPnl = (preset: string) => {
    const dates = rangeDates(preset, settings.timezone);
    return summarize(
      filterRange(selected, settings.timezone, dates.start, dates.end),
    ).net;
  };
  const metrics = [
    [
      "Total net P&L",
      money(s.net, settings.currency),
      `${s.total} closed trades`,
      s.net < 0 ? "negative" : "positive",
    ],
    [
      "Win rate",
      s.winRate === null ? "—" : `${number(s.winRate, 1)}%`,
      `${s.wins} wins · ${s.losses} losses · ${s.breakeven} breakeven`,
      undefined,
    ],
    [
      "Profit factor",
      s.profitFactor === Infinity ? "∞" : number(s.profitFactor),
      "Gross profits ÷ absolute gross losses",
      undefined,
    ],
    [
      "Average realized R",
      s.averageR === null ? "—" : `${number(s.averageR)} R`,
      "Net P&L relative to initial risk",
      undefined,
    ],
  ] as const;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3">YOUR TRADING, IN PERSPECTIVE</p>
          <h1 className="page-title">
            Performance overview<span className="text-primary">.</span>
          </h1>
          <p className="page-description">
            A clear view of your results. A better understanding of your
            process.
          </p>
        </div>
        <DateFilter range={range} setRange={setRange} />
      </div>
      {!trades.length && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-accent/30 px-5 py-4">
          <div>
            <p className="text-xs font-medium">
              Welcome to your trading journal.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Your first trade is the first step toward understanding your edge.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/trades/new">
              <Plus className="size-3" />
              Journal your first trade
            </Link>
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, detail, tone]) => (
          <Metric
            key={label}
            label={label}
            value={value}
            detail={detail}
            tone={tone}
          />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Chart
          title="Cumulative realized P&L"
          subtitle="The bigger picture, one closed trade at a time"
          data={a.curve}
          type="area"
          currency={settings.currency}
          height={270}
        />
        <Chart
          title="Daily performance"
          subtitle={`Net realized results · ${settings.timezone}`}
          data={a.daily.map((d) => ({ name: d.name.slice(5), value: d.net }))}
          currency={settings.currency}
          height={270}
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Today’s P&L"
          value={money(daily?.net || 0, settings.currency)}
          detail={`${daily?.total || 0} closed trades in selected range`}
        />
        <Metric
          label="This week"
          value={money(periodPnl("This Week"), settings.currency)}
          detail="Monday through today · within range"
        />
        <Metric
          label="This month"
          value={money(periodPnl("This Month"), settings.currency)}
          detail="Month to date · within range"
        />
        <Metric
          label="Maximum drawdown"
          value={money(s.maxDrawdown, settings.currency)}
          detail="Peak-to-trough cumulative realized P&L"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent trades</h2>
            <Link
              href="/trades"
              className="flex items-center gap-1 text-[11px] text-primary"
            >
              View history
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <TradeHistory compact trades={selected} settings={settings} />
        </div>
        <div className="space-y-4">
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <CardTitle>Trading discipline</CardTitle>
              <Target className="size-4 text-primary" />
            </div>
            <p className="text-3xl font-medium tracking-tight">
              {s.discipline === null ? "—" : `${number(s.discipline, 0)}%`}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              of recorded plan decisions followed the plan
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${s.discipline || 0}%` }}
              />
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-primary" />
              <CardTitle>Current streak</CardTitle>
            </div>
            <p className="mt-4 text-xl font-medium">
              {Math.abs(s.streak)}{" "}
              {s.streak < 0 ? "losses" : s.streak > 0 ? "wins" : "trades"}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {s.streak === 0
                ? "No active win or loss streak."
                : "Based on closed trades in this range."}
            </p>
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Chart
          title="Win / loss distribution"
          data={
            s.total
              ? [
                  { name: "Wins", value: s.wins },
                  { name: "Losses", value: s.losses },
                  { name: "Breakeven", value: s.breakeven },
                ].filter((d) => d.value)
              : []
          }
          type="pie"
          height={200}
        />
        <Chart
          title="Performance by instrument"
          data={a.instruments.map((d) => ({ name: d.name, value: d.net }))}
          currency={settings.currency}
          height={200}
        />
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Days worth reflecting on</CardTitle>
            <CalendarDays className="size-4 text-primary" />
          </div>
          <div className="mt-6 space-y-5">
            {[
              ["Best day", best],
              ["Worst day", worst],
            ].map(([label, day]) => {
              const d = day as typeof best;
              return (
                <div
                  key={label as string}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs">{label as string}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {d?.name || "No closed trades yet"}
                    </p>
                  </div>
                  <span
                    className={`tabular text-sm ${(d?.net ?? 0) < 0 ? "text-loss" : "text-profit"}`}
                  >
                    {money(d?.net, settings.currency)}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="mt-6 grid grid-cols-7 gap-1"
            aria-label="Last seven trading calendar days"
          >
            {Array.from({ length: 7 }, (_, index) => {
              const date = new Date(`${today}T12:00:00Z`);
              date.setUTCDate(date.getUTCDate() - 6 + index);
              const key = date.toISOString().slice(0, 10);
              const result = a.daily.find((day) => day.name === key);
              return (
                <span
                  key={key}
                  title={`${key}: ${result ? money(result.net, settings.currency) : "No closed trades in selected range"}`}
                  className={`flex h-8 items-center justify-center rounded text-[10px] ${result ? (result.net > 0 ? "bg-profit/15 text-profit" : result.net < 0 ? "bg-loss/15 text-loss" : "bg-muted text-muted-foreground") : "bg-muted/40 text-muted-foreground/50"}`}
                >
                  {key.slice(-2)}
                </span>
              );
            })}
          </div>
          <Link
            className="mt-8 inline-flex items-center gap-1 text-[11px] text-primary"
            href="/calendar"
          >
            Open trading calendar
            <ArrowUpRight className="size-3" />
          </Link>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Chart
          title="Weekly performance"
          data={a.weekly.map((d) => ({ name: d.name, value: d.net }))}
          currency={settings.currency}
          height={180}
        />
        <Chart
          title="Monthly performance"
          data={a.monthly.map((d) => ({ name: d.name, value: d.net }))}
          currency={settings.currency}
          height={180}
        />
      </div>
      <Card className="mt-6">
        <CardTitle>Performance details</CardTitle>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total closed trades", String(s.total)],
            ["Average winning trade", money(s.averageWin, settings.currency)],
            ["Average losing trade", money(s.averageLoss, settings.currency)],
            [
              "Average planned reward / risk",
              s.plannedRR === null ? "—" : `${number(s.plannedRR)} : 1`,
            ],
            ["Largest win", money(s.largestWin, settings.currency)],
            ["Largest loss", money(s.largestLoss, settings.currency)],
            ["Expected value / trade", money(s.expectancy, settings.currency)],
            [
              "Average duration",
              s.averageDuration === null
                ? "—"
                : `${number(s.averageDuration)} min`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="tabular mt-2 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
