"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Image,
  Plus,
  Search,
  BookOpen,
} from "lucide-react";
import {
  calculateTrade,
  money,
  number,
  type Trade,
  type Settings,
} from "@/lib/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function TradeHistory({
  trades,
  settings,
  compact = false,
}: {
  trades: Trade[];
  settings: Settings;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [instrument, setInstrument] = useState("");
  const [direction, setDirection] = useState("");
  const [outcome, setOutcome] = useState("");
  const [plan, setPlan] = useState("");
  const [mistake, setMistake] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sort, setSort] = useState<"date" | "pnl" | "instrument">("date");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      trades
        .filter((t) => {
          const match =
            `${t.symbol} ${Object.values(t.notes || {}).join(" ")} ${(t.mistakes || []).join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase());
          return (
            match &&
            (!instrument || t.symbol === instrument) &&
            (!direction || t.direction === direction) &&
            (!outcome ||
              (outcome === "open" || outcome === "draft"
                ? t.status === outcome
                : calculateTrade(t).outcome === outcome)) &&
            (!plan || String(t.followed_plan) === plan) &&
            (!mistake || t.mistakes.includes(mistake)) &&
            (!start || t.trade_date >= start) &&
            (!end || t.trade_date <= end)
          );
        })
        .sort((a, b) => {
          const difference =
            sort === "pnl"
              ? (calculateTrade(a).net ?? -Infinity) -
                (calculateTrade(b).net ?? -Infinity)
              : sort === "instrument"
                ? a.symbol.localeCompare(b.symbol)
                : (a.entry_at || a.trade_date).localeCompare(
                    b.entry_at || b.trade_date,
                  );
          return ascending ? difference : -difference;
        }),
    [
      trades,
      search,
      instrument,
      direction,
      outcome,
      plan,
      mistake,
      start,
      end,
      sort,
      ascending,
    ],
  );
  const shown = compact
    ? filtered.slice(0, 5)
    : filtered.slice(page * 20, (page + 1) * 20);
  const filterChange =
    (set: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      set(e.target.value);
      setPage(0);
    };
  return (
    <Card className="overflow-hidden p-0">
      {!compact && (
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                aria-label="Search trades and notes"
                className="pl-9"
                placeholder="Search instruments, notes, mistakes…"
                value={search}
                onChange={filterChange(setSearch)}
              />
            </div>
            <select
              className="w-auto"
              aria-label="Filter instrument"
              value={instrument}
              onChange={filterChange(setInstrument)}
            >
              <option value="">All instruments</option>
              {[...new Set(trades.map((t) => t.symbol))].sort().map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="w-auto"
              aria-label="Filter direction"
              value={direction}
              onChange={filterChange(setDirection)}
            >
              <option value="">All directions</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
            <select
              className="w-auto"
              aria-label="Filter outcome or status"
              value={outcome}
              onChange={filterChange(setOutcome)}
            >
              <option value="">All outcomes</option>
              {["Win", "Loss", "Breakeven", "open", "draft"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="w-40 text-[10px] text-muted-foreground">
              From (trade date)
              <input
                type="date"
                value={start}
                onChange={filterChange(setStart)}
              />
            </label>
            <label className="w-40 text-[10px] text-muted-foreground">
              To (trade date)
              <input type="date" value={end} onChange={filterChange(setEnd)} />
            </label>
            <select
              className="w-auto"
              aria-label="Filter plan adherence"
              value={plan}
              onChange={filterChange(setPlan)}
            >
              <option value="">Any plan adherence</option>
              <option value="true">Plan followed</option>
              <option value="false">Plan not followed</option>
            </select>
            <select
              className="w-auto"
              aria-label="Filter mistake"
              value={mistake}
              onChange={filterChange(setMistake)}
            >
              <option value="">Any mistake</option>
              {[...new Set(trades.flatMap((t) => t.mistakes))]
                .sort()
                .map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
            <select
              className="w-auto"
              aria-label="Sort trades"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="date">Sort by date</option>
              <option value="pnl">Sort by net P&L</option>
              <option value="instrument">Sort by instrument</option>
            </select>
            <Button
              variant="outline"
              size="icon"
              aria-label={ascending ? "Sort descending" : "Sort ascending"}
              onClick={() => setAscending(!ascending)}
            >
              <ArrowDownUp className="size-4" />
            </Button>
          </div>
          {start && end && start > end && (
            <p className="text-xs text-loss" role="alert">
              The start date is after the end date.
            </p>
          )}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "Trade date",
                "Instrument",
                "Direction",
                "Qty",
                ...(!compact
                  ? ["Entry", "Stop", "Target", "Exit", "Gross P&L"]
                  : []),
                "Net P&L",
                "Realized R",
                "Outcome",
                "",
              ].map((label, i) => (
                <th key={label || i}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => {
              const m = calculateTrade(t);
              return (
                <tr key={t.id}>
                  <td>
                    <Link
                      className="hover:text-primary"
                      href={`/trades/${t.id}`}
                    >
                      {new Date(`${t.trade_date}T12:00:00Z`).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        },
                      )}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/trades/${t.id}`} className="font-semibold">
                      {t.symbol}
                    </Link>
                    {(t.trade_screenshots?.length || 0) > 0 && (
                      <Image
                        aria-label="Has screenshots"
                        className="ml-2 inline size-3 text-muted-foreground"
                      />
                    )}
                  </td>
                  <td>
                    <span
                      className={`rounded px-2 py-1 text-[10px] ${t.direction === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}
                    >
                      {t.direction === "long" ? "↗ Long" : "↘ Short"}
                    </span>
                  </td>
                  <td>{t.contracts ?? "—"}</td>
                  {!compact &&
                    [
                      t.entry_price,
                      t.stop_price,
                      t.target_price,
                      t.exit_price,
                      m.gross,
                    ].map((v, i) => (
                      <td className="tabular" key={i}>
                        {i === 4 ? money(v, settings.currency) : number(v, 4)}
                      </td>
                    ))}
                  <td
                    className={`tabular font-semibold ${m.net === null ? "text-muted-foreground" : m.net < 0 ? "text-loss" : "text-profit"}`}
                  >
                    {money(m.net, settings.currency)}
                  </td>
                  <td className="tabular text-muted-foreground">
                    {m.realizedR === null ? "—" : `${number(m.realizedR)} R`}
                  </td>
                  <td>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] ${m.outcome === "Win" ? "border-profit/20 text-profit" : m.outcome === "Loss" ? "border-loss/20 text-loss" : "border-border text-muted-foreground"}`}
                    >
                      {m.outcome || t.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/trades/${t.id}`}
                      aria-label={`Open ${t.symbol} trade on ${t.trade_date}`}
                    >
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <div className="px-5 py-16 text-center">
          <BookOpen className="mx-auto mb-4 size-7 text-muted-foreground" />
          <h3 className="text-sm font-medium">
            {trades.length
              ? "No trades match these filters."
              : "Your trading story starts here."}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {trades.length
              ? "Adjust your search or filters to see more trades."
              : "Log your first trade to start discovering patterns."}
          </p>
          {!trades.length && (
            <Button asChild size="sm" className="mt-5">
              <Link href="/trades/new">
                <Plus className="size-3" />
                Add your first trade
              </Link>
            </Button>
          )}
        </div>
      )}
      {!compact && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
          <p>
            {filtered.length} trades · showing{" "}
            {filtered.length ? page * 20 + 1 : 0}–
            {Math.min((page + 1) * 20, filtered.length)}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={(page + 1) * 20 >= filtered.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
