import { Decimal } from "decimal.js";
import { calculateTrade, type Trade } from "./calculations.ts";
import { dayKey, localDateTime } from "./dates.ts";
export function realizedTrades(trades: Trade[]) {
  return trades
    .filter(
      (t) =>
        t.status === "closed" && !!t.exit_at && calculateTrade(t).net !== null,
    )
    .sort(
      (a, b) =>
        a.exit_at!.localeCompare(b.exit_at!) || a.id.localeCompare(b.id),
    );
}
const sum = (values: number[]) =>
  values.reduce((total, value) => total.plus(value), new Decimal(0)).toNumber();
const average = (values: number[]) =>
  values.length ? new Decimal(sum(values)).div(values.length).toNumber() : null;
export function summarize(trades: Trade[]) {
  const closed = realizedTrades(trades);
  const results = closed.map(calculateTrade);
  const values = results.map((r) => r.net!);
  const wins = values.filter((v) => v > 0);
  const losses = values.filter((v) => v < 0);
  const total = closed.length;
  const net = sum(values);
  const gross = sum(results.map((r) => r.gross!));
  let running = new Decimal(0),
    peak = new Decimal(0),
    maxDrawdown = new Decimal(0);
  let consecutiveWins = 0,
    consecutiveLosses = 0,
    streak = 0;
  values.forEach((v) => {
    running = running.plus(v);
    peak = Decimal.max(peak, running);
    maxDrawdown = Decimal.max(maxDrawdown, peak.minus(running));
    if (v > 0) {
      streak = streak > 0 ? streak + 1 : 1;
      consecutiveWins = Math.max(consecutiveWins, streak);
    } else if (v < 0) {
      streak = streak < 0 ? streak - 1 : -1;
      consecutiveLosses = Math.max(consecutiveLosses, -streak);
    } else streak = 0;
  });
  const knownPlan = closed.filter((t) => t.followed_plan !== null);
  const followed = knownPlan.filter((t) => t.followed_plan);
  return {
    total,
    net,
    gross,
    wins: wins.length,
    losses: losses.length,
    breakeven: values.filter((v) => v === 0).length,
    winRate: total ? (wins.length / total) * 100 : null,
    profitFactor: losses.length
      ? sum(wins) / Math.abs(sum(losses))
      : wins.length
        ? Infinity
        : null,
    averageWin: average(wins),
    averageLoss: average(losses),
    averageR: average(
      results.flatMap((r) => (r.realizedR === null ? [] : [r.realizedR])),
    ),
    plannedRR: average(
      results.flatMap((r) => (r.plannedRR === null ? [] : [r.plannedRR])),
    ),
    averageRisk: average(
      results.flatMap((r) => (r.risk === null ? [] : [r.risk])),
    ),
    averageDuration: average(
      results.flatMap((r) =>
        r.durationMinutes === null ? [] : [r.durationMinutes],
      ),
    ),
    expectancy: total ? net / total : null,
    largestWin: wins.length ? Math.max(...wins) : null,
    largestLoss: losses.length ? Math.min(...losses) : null,
    maxDrawdown: maxDrawdown.toNumber(),
    consecutiveWins,
    consecutiveLosses,
    streak,
    discipline: knownPlan.length
      ? (followed.length / knownPlan.length) * 100
      : null,
  };
}
export type Summary = ReturnType<typeof summarize>;
export type Group = { name: string } & Summary;
export function groupTrades(
  trades: Trade[],
  key: (trade: Trade) => string,
): Group[] {
  const groups = new Map<string, Trade[]>();
  realizedTrades(trades).forEach((t) => {
    const name = key(t);
    if (!name) return;
    groups.set(name, [...(groups.get(name) || []), t]);
  });
  return [...groups.entries()]
    .map(([name, trades]) => ({ name, ...summarize(trades) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function filterRange(
  trades: Trade[],
  timezone: string,
  start?: string,
  end?: string,
) {
  return realizedTrades(trades).filter((t) => {
    const date = dayKey(t.exit_at!, timezone);
    return (!start || date >= start) && (!end || date <= end);
  });
}
export function rangeDates(
  preset: string,
  timezone: string,
  now = new Date(),
): { start: string; end: string } {
  const today = dayKey(now, timezone);
  const date = new Date(`${today}T12:00:00Z`);
  const end = today;
  if (preset === "Today") return { start: today, end };
  if (preset === "This Week") {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return { start: date.toISOString().slice(0, 10), end };
  }
  if (preset === "This Month") return { start: today.slice(0, 7) + "-01", end };
  if (preset === "Last 30 Days" || preset === "Last 90 Days") {
    date.setUTCDate(date.getUTCDate() - (preset === "Last 30 Days" ? 29 : 89));
    return { start: date.toISOString().slice(0, 10), end };
  }
  return { start: "", end: "" };
}
export function analyze(trades: Trade[], timezone: string) {
  const closed = realizedTrades(trades);
  const daily = groupTrades(closed, (t) => dayKey(t.exit_at!, timezone));
  let running = new Decimal(0);
  const curve = daily.map((d) => {
    running = running.plus(d.net);
    return { name: d.name, value: running.toNumber() };
  });
  const session = (t: Trade) => {
    const time = localDateTime(t.entry_at!, timezone).slice(11);
    return time < "07:00"
      ? "00:00–06:59"
      : time < "09:30"
        ? "07:00–09:29"
        : time < "16:00"
          ? "09:30–15:59"
          : "16:00–23:59";
  };
  const afterLoss: Group[] = [];
  let losses = 0;
  const afterOne: Trade[] = [],
    afterMultiple: Trade[] = [];
  closed.forEach((t) => {
    if (losses === 1) afterOne.push(t);
    if (losses >= 2) afterMultiple.push(t);
    const net = calculateTrade(t).net!;
    losses = net < 0 ? losses + 1 : 0;
  });
  if (afterOne.length)
    afterLoss.push({ name: "After 1 loss", ...summarize(afterOne) });
  if (afterMultiple.length)
    afterLoss.push({ name: "After 2+ losses", ...summarize(afterMultiple) });
  const mistakes = [...new Set(closed.flatMap((t) => t.mistakes))]
    .map((name) => ({
      name,
      ...summarize(closed.filter((t) => t.mistakes.includes(name))),
    }))
    .sort((a, b) => b.total - a.total);
  const risk = groupTrades(closed, (t) => {
    const r = calculateTrade(t).risk;
    return r === null
      ? ""
      : r < 100
        ? "Under $100"
        : r < 250
          ? "$100–249"
          : r < 500
            ? "$250–499"
            : r < 1000
              ? "$500–999"
              : "$1,000+";
  });
  return {
    daily,
    curve,
    weekly: groupTrades(closed, (t) => {
      const d = new Date(`${dayKey(t.exit_at!, timezone)}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    }),
    monthly: groupTrades(closed, (t) =>
      dayKey(t.exit_at!, timezone).slice(0, 7),
    ),
    instruments: groupTrades(closed, (t) => t.symbol),
    weekday: groupTrades(closed, (t) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
      }).format(new Date(t.entry_at!)),
    ),
    hour: groupTrades(
      closed,
      (t) => localDateTime(t.entry_at!, timezone).slice(11, 13) + ":00",
    ),
    sessions: groupTrades(closed, session),
    quantity: groupTrades(closed, (t) => String(t.contracts) + " contracts"),
    plan: groupTrades(closed, (t) =>
      t.followed_plan === null
        ? ""
        : t.followed_plan
          ? "Plan followed"
          : "Plan not followed",
    ),
    emotions: groupTrades(closed, (t) => t.emotion_before),
    mistakes,
    risk,
    afterLoss,
  };
}
