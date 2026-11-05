import { Decimal } from "decimal.js";
export type ContractSpec = {
  id?: string;
  symbol: string;
  name: string;
  tick_size: number;
  point_value: number;
};
export const CONTRACTS: ContractSpec[] = [
  { symbol: "NQ", name: "E-mini Nasdaq-100", tick_size: 0.25, point_value: 20 },
  {
    symbol: "MNQ",
    name: "Micro E-mini Nasdaq-100",
    tick_size: 0.25,
    point_value: 2,
  },
  { symbol: "ES", name: "E-mini S&P 500", tick_size: 0.25, point_value: 50 },
  {
    symbol: "MES",
    name: "Micro E-mini S&P 500",
    tick_size: 0.25,
    point_value: 5,
  },
  { symbol: "GC", name: "Gold", tick_size: 0.1, point_value: 100 },
  { symbol: "MGC", name: "Micro Gold", tick_size: 0.1, point_value: 10 },
  { symbol: "CL", name: "WTI Crude Oil", tick_size: 0.01, point_value: 1000 },
  {
    symbol: "MCL",
    name: "Micro WTI Crude Oil",
    tick_size: 0.01,
    point_value: 100,
  },
];
export type CalculationInput = {
  symbol: string;
  tick_size: number;
  point_value: number;
  direction: "long" | "short";
  status: "draft" | "open" | "closed";
  entry_price: number | null;
  stop_price: number | null;
  target_price: number | null;
  exit_price: number | null;
  contracts: number | null;
  commission: number;
  fees: number;
  adjustment: number;
  adjustment_reason: string;
  entry_at: string | null;
  exit_at: string | null;
};
export type Trade = CalculationInput & {
  id: string;
  user_id: string;
  submission_id: string;
  trade_date: string;
  contract_expiration: string | null;
  notes: Record<string, string>;
  emotion_before: string;
  emotion_during: string;
  emotion_after: string;
  confidence: number | null;
  followed_plan: boolean | null;
  mistakes: string[];
  created_at: string;
  updated_at: string;
  trade_screenshots?: Screenshot[];
};
export type Screenshot = {
  id: string;
  object_path: string;
  caption: string;
  url?: string;
};
export type JournalEntry = {
  id: string;
  entry_date: string;
  content: Record<string, string>;
  journal_screenshots?: Screenshot[];
};
export type Settings = {
  timezone: string;
  currency: string;
  theme: "dark" | "light" | "system";
  screenshot_limit_mb: number;
};
export const DEFAULT_SETTINGS: Settings = {
  timezone: "America/Toronto",
  currency: "USD",
  theme: "dark",
  screenshot_limit_mb: 10,
};
const valid = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && Number.isFinite(v);
export function calculateTrade(t: CalculationInput) {
  const hasEntry =
    valid(t.entry_price) &&
    valid(t.contracts) &&
    t.contracts > 0 &&
    valid(t.point_value) &&
    t.point_value > 0;
  const multiplier = hasEntry
    ? new Decimal(t.point_value).mul(t.contracts!)
    : null;
  const risk =
    hasEntry && valid(t.stop_price)
      ? new Decimal(t.entry_price!).minus(t.stop_price).abs().mul(multiplier!)
      : null;
  const reward =
    hasEntry && valid(t.target_price)
      ? new Decimal(t.target_price).minus(t.entry_price!).abs().mul(multiplier!)
      : null;
  const realized = t.status === "closed" && hasEntry && valid(t.exit_price);
  const points = realized
    ? new Decimal(t.exit_price!)
        .minus(t.entry_price!)
        .mul(t.direction === "long" ? 1 : -1)
    : null;
  const gross = points?.mul(multiplier!) ?? null;
  const net =
    gross?.minus(t.commission).minus(t.fees).plus(t.adjustment) ?? null;
  const start = t.entry_at ? Date.parse(t.entry_at) : NaN;
  const end = t.exit_at ? Date.parse(t.exit_at) : NaN;
  return {
    points: points?.toNumber() ?? null,
    ticks:
      points && t.tick_size > 0 ? points.div(t.tick_size).toNumber() : null,
    gross: gross?.toNumber() ?? null,
    net: net?.toNumber() ?? null,
    risk: risk?.toNumber() ?? null,
    plannedRR: risk?.gt(0) && reward ? reward.div(risk).toNumber() : null,
    realizedR: risk?.gt(0) && net ? net.div(risk).toNumber() : null,
    durationMinutes:
      realized && Number.isFinite(start) && Number.isFinite(end) && end >= start
        ? (end - start) / 60000
        : null,
    outcome: net
      ? net.gt(0)
        ? "Win"
        : net.lt(0)
          ? "Loss"
          : "Breakeven"
      : null,
  };
}
export function validateTrade(t: CalculationInput): string[] {
  const errors: string[] = [];
  if (!["draft", "open", "closed"].includes(t.status))
    errors.push("Choose a valid trade status.");
  if (!["long", "short"].includes(t.direction))
    errors.push("Choose long or short.");
  if (
    !valid(t.tick_size) ||
    t.tick_size <= 0 ||
    !valid(t.point_value) ||
    t.point_value <= 0
  )
    errors.push("Choose a valid instrument.");
  for (const [name, v] of [
    ["Entry price", t.entry_price],
    ["Stop price", t.stop_price],
    ["Target price", t.target_price],
    ["Exit price", t.exit_price],
  ] as const) {
    if (v !== null && (!valid(v) || v <= 0))
      errors.push(`${name} must be positive.`);
    else if (
      valid(v) &&
      valid(t.tick_size) &&
      t.tick_size > 0 &&
      !new Decimal(v).mod(t.tick_size).isZero()
    )
      errors.push(`${name} must use ${t.tick_size} tick increments.`);
  }
  if (
    t.contracts !== null &&
    (!Number.isSafeInteger(t.contracts) || t.contracts <= 0)
  )
    errors.push("Contracts must be a positive whole number.");
  if (
    t.status !== "draft" &&
    (!valid(t.entry_price) || !t.contracts || !t.entry_at)
  )
    errors.push(
      "Open and closed trades require entry price, time, and contracts.",
    );
  if (t.status === "closed" && (!valid(t.exit_price) || !t.exit_at))
    errors.push("Closed trades require an exit price and time.");
  if (
    valid(t.entry_price) &&
    valid(t.stop_price) &&
    ((t.direction === "long" && t.stop_price >= t.entry_price) ||
      (t.direction === "short" && t.stop_price <= t.entry_price))
  )
    errors.push("Stop must be below a long entry or above a short entry.");
  if (
    valid(t.entry_price) &&
    valid(t.target_price) &&
    ((t.direction === "long" && t.target_price <= t.entry_price) ||
      (t.direction === "short" && t.target_price >= t.entry_price))
  )
    errors.push("Target must be above a long entry or below a short entry.");
  for (const [name, v] of [
    ["Commission", t.commission],
    ["Fees", t.fees],
  ] as const)
    if (!Number.isFinite(v) || v < 0)
      errors.push(`${name} must be zero or positive.`);
  if (!Number.isFinite(t.adjustment))
    errors.push("Adjustment must be a valid number.");
  if (t.adjustment !== 0 && !t.adjustment_reason?.trim())
    errors.push("Explain the manual adjustment.");
  if (t.entry_at && !Number.isFinite(Date.parse(t.entry_at)))
    errors.push("Entry time is invalid.");
  if (t.exit_at && !Number.isFinite(Date.parse(t.exit_at)))
    errors.push("Exit time is invalid.");
  if (t.entry_at && t.exit_at && Date.parse(t.exit_at) < Date.parse(t.entry_at))
    errors.push("Exit cannot be before entry.");
  return errors;
}
export function money(value: number | null | undefined, currency = "USD") {
  return value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
}
export function number(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
        value,
      );
}
