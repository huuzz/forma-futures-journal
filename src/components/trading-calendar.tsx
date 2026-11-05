"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradeHistory } from "@/components/trade-history";
import { ScreenshotGallery } from "@/components/screenshots";
import { summarize, filterRange } from "@/lib/analytics";
import { dayKey } from "@/lib/dates";
import {
  money,
  type Trade,
  type Settings,
  type JournalEntry,
} from "@/lib/calculations";
export function TradingCalendar({
  trades,
  journals,
  settings,
}: {
  trades: Trade[];
  journals: JournalEntry[];
  settings: Settings;
}) {
  const today = dayKey(new Date(), settings.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1, 12));
  const last = new Date(Date.UTC(year, monthNumber, 0, 12));
  const offset = (first.getUTCDay() + 6) % 7;
  const weeks = Math.ceil((offset + last.getUTCDate()) / 7);
  const monthTrades = filterRange(
    trades,
    settings.timezone,
    `${month}-01`,
    `${month}-${String(last.getUTCDate()).padStart(2, "0")}`,
  );
  const summary = summarize(monthTrades);
  const dayTrades = trades.filter((t) =>
    t.status === "closed" && t.exit_at
      ? dayKey(t.exit_at, settings.timezone) === selected
      : t.trade_date === selected,
  );
  const daySummary = summarize(dayTrades);
  const journal = journals.find((j) => j.entry_date === selected);
  function move(delta: number) {
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1, 12));
    setMonth(date.toISOString().slice(0, 7));
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">CONSISTENCY, ONE DAY AT A TIME</p>
          <h1 className="page-title">Trading calendar</h1>
          <p className="page-description">
            Your realized results and daily reflections · {settings.timezone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => move(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <input
            aria-label="Calendar month and year"
            className="w-auto"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => move(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setMonth(today.slice(0, 7));
              setSelected(today);
            }}
          >
            Today
          </Button>
        </div>
      </div>
      <Card className="mb-6 overflow-x-auto p-0">
        <div className="flex min-w-[720px] items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-base font-medium">
              {first.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {summary.total} closed trades · week totals include this month
              only
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">MONTHLY NET P&L</p>
            <p
              className={`tabular mt-1 text-xl font-medium ${summary.net < 0 ? "text-loss" : "text-profit"}`}
            >
              {money(summary.net, settings.currency)}
            </p>
          </div>
        </div>
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_100px] border-b border-border">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "WEEK"].map(
              (d) => (
                <div
                  key={d}
                  className="px-3 py-3 text-center text-[9px] tracking-widest text-muted-foreground"
                >
                  {d}
                </div>
              ),
            )}
          </div>
          {Array.from({ length: weeks }, (_, week) => {
            const dates = Array.from(
              { length: 7 },
              (_, day) => week * 7 + day - offset + 1,
            );
            const weekly = monthTrades.filter((t) =>
              dates.includes(
                Number(dayKey(t.exit_at!, settings.timezone).slice(-2)),
              ),
            );
            const weeklySummary = summarize(weekly);
            return (
              <div
                key={week}
                className="grid grid-cols-[repeat(7,minmax(0,1fr))_100px] border-b border-border last:border-b-0"
              >
                {dates.map((day, i) => {
                  const inside = day > 0 && day <= last.getUTCDate();
                  const date = `${month}-${String(day).padStart(2, "0")}`;
                  const dayClosed = inside
                    ? monthTrades.filter(
                        (t) => dayKey(t.exit_at!, settings.timezone) === date,
                      )
                    : [];
                  const daily = summarize(dayClosed);
                  const hasJournal = journals.some(
                    (j) => j.entry_date === date,
                  );
                  return (
                    <button
                      key={i}
                      disabled={!inside}
                      aria-label={
                        inside
                          ? `${date}, ${daily.total} closed trades, ${money(daily.net, settings.currency)}${hasJournal ? ", journal entry" : ""}`
                          : "Outside month"
                      }
                      aria-pressed={selected === date}
                      onClick={() => setSelected(date)}
                      className={`min-h-28 border-r border-border p-3 text-left transition-colors ${!inside ? "bg-muted/30" : selected === date ? "bg-accent ring-1 ring-inset ring-primary/60" : daily.total ? (daily.net > 0 ? "bg-profit/7 hover:bg-profit/12" : daily.net < 0 ? "bg-loss/7 hover:bg-loss/12" : "bg-muted/60") : "hover:bg-muted/50"}`}
                    >
                      {inside && (
                        <>
                          <div className="flex justify-between">
                            <span
                              className={`flex size-5 items-center justify-center rounded-full text-[11px] ${date === today ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                            >
                              {day}
                            </span>
                            {hasJournal && (
                              <BookOpen className="size-3 text-primary" />
                            )}
                          </div>
                          {daily.total ? (
                            <>
                              <p
                                className={`tabular mt-4 text-xs font-semibold ${daily.net < 0 ? "text-loss" : daily.net > 0 ? "text-profit" : "text-muted-foreground"}`}
                              >
                                {money(daily.net, settings.currency)}
                              </p>
                              <p className="mt-1 text-[9px] text-muted-foreground">
                                {daily.total} trade
                                {daily.total !== 1 ? "s" : ""}
                              </p>
                            </>
                          ) : (
                            <p className="mt-5 text-[10px] text-muted-foreground/40">
                              —
                            </p>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
                <div className="flex flex-col items-center justify-center bg-muted/20 p-2">
                  <p
                    className={`tabular text-xs font-medium ${weeklySummary.net < 0 ? "text-loss" : weeklySummary.total ? "text-profit" : "text-muted-foreground"}`}
                  >
                    {weeklySummary.total
                      ? money(weeklySummary.net, settings.currency)
                      : "—"}
                  </p>
                  <p className="mt-2 text-[9px] text-muted-foreground">
                    {weeklySummary.total} trades
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">
            {new Date(selected + "T12:00:00Z").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {dayTrades.length} trades · net realized{" "}
            <span className={daySummary.net < 0 ? "text-loss" : "text-profit"}>
              {money(daySummary.net, settings.currency)}
            </span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/journal?date=${selected}`}>
            {journal ? "Open daily reflection" : "Write daily reflection"}
            <ArrowUpRight className="size-3" />
          </Link>
        </Button>
      </div>
      <TradeHistory trades={dayTrades} settings={settings} compact />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Daily reflection</CardTitle>
          {journal ? (
            <dl className="mt-5 space-y-5">
              {Object.entries(journal.content)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="eyebrow">{key.replaceAll("_", " ")}</dt>
                    <dd className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="mt-5 text-xs leading-6 text-muted-foreground">
              No reflection for this date yet. Capture what you learned while
              the day is still fresh.
            </p>
          )}
          {journal?.journal_screenshots && (
            <div className="mt-5">
              <ScreenshotGallery
                kind="journal"
                images={journal.journal_screenshots}
              />
            </div>
          )}
        </Card>
        <Card>
          <CardTitle>Trade context & screenshots</CardTitle>
          <div className="mt-5 space-y-6">
            {dayTrades.length ? (
              dayTrades.map((t) => (
                <div key={t.id}>
                  <Link
                    href={`/trades/${t.id}`}
                    className="text-xs font-medium text-primary"
                  >
                    {t.symbol} · {t.direction} · Open details ↗
                  </Link>
                  {t.notes.reason && (
                    <p className="my-3 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                      {t.notes.reason}
                    </p>
                  )}
                  <ScreenshotGallery
                    kind="trade"
                    images={t.trade_screenshots || []}
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No trade context recorded for this day.
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
