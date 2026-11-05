import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Trade } from "../src/lib/calculations.ts";
import {
  summarize,
  groupTrades,
  filterRange,
  analyze,
} from "../src/lib/analytics.ts";
const fixture = (
  id: string,
  net: number,
  exit_at: string,
  update: Partial<Trade> = {},
): Trade => ({
  id,
  user_id: "test",
  submission_id: id,
  trade_date: exit_at.slice(0, 10),
  symbol: "MNQ",
  tick_size: 0.25,
  point_value: 2,
  direction: "long",
  status: "closed",
  entry_price: 100,
  stop_price: 50,
  target_price: 200,
  exit_price: 100 + net / 2,
  contracts: 1,
  commission: 0,
  fees: 0,
  adjustment: 0,
  adjustment_reason: "",
  entry_at: exit_at,
  exit_at,
  contract_expiration: null,
  notes: {},
  emotion_before: "Calm",
  emotion_during: "",
  emotion_after: "",
  confidence: 3,
  followed_plan: true,
  mistakes: [],
  created_at: exit_at,
  updated_at: exit_at,
  ...update,
});
const trades = [
  fixture("a", 100, "2026-11-02T15:00:00Z"),
  fixture("b", -40, "2026-11-03T15:00:00Z", {
    followed_plan: false,
    mistakes: ["FOMO"],
  }),
  fixture("c", 0, "2026-11-04T15:00:00Z"),
  fixture("d", 5000, "2026-11-04T16:00:00Z", { status: "open" }),
];
test("summary uses only realized trades and counts breakeven correctly", () => {
  const s = summarize(trades);
  assert.equal(s.total, 3);
  assert.equal(s.net, 60);
  assert.ok(Math.abs(s.winRate! - 33.3333333333333) < 1e-10);
  assert.equal(s.profitFactor, 2.5);
  assert.equal(s.averageWin, 100);
  assert.equal(s.averageLoss, -40);
  assert.equal(s.expectancy, 20);
  assert.equal(s.maxDrawdown, 40);
  assert.equal(s.averageR, 0.2);
  assert.ok(Math.abs(s.discipline! - 66.6666666666667) < 1e-10);
});
test("empty data and no-loss samples have explicit unavailable ratios", () => {
  const s = summarize([]);
  assert.equal(s.net, 0);
  assert.equal(s.winRate, null);
  assert.equal(s.profitFactor, null);
  assert.equal(s.averageR, null);
  assert.equal(summarize([trades[0]]).profitFactor, Infinity);
  assert.equal(summarize([trades[2]]).profitFactor, null);
});
test("daily grouping uses exit timezone instead of entry or UTC date", () => {
  const g = groupTrades([fixture("x", 20, "2026-11-05T01:00:00Z")], (t) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(
      new Date(t.exit_at!),
    ),
  );
  assert.equal(g[0].name, "2026-11-04");
  assert.equal(g[0].net, 20);
});
test("inclusive date filters apply to realized exit dates", () => {
  assert.deepEqual(
    filterRange(trades, "America/Toronto", "2026-11-03", "2026-11-04").map(
      (t) => t.id,
    ),
    ["b", "c"],
  );
});
test("streaks and drawdown use chronological closes regardless of source ordering", () => {
  const s = summarize([trades[2], trades[1], trades[0]]);
  assert.equal(s.maxDrawdown, 40);
  assert.equal(s.consecutiveWins, 1);
  assert.equal(s.consecutiveLosses, 1);
  assert.equal(s.streak, 0);
});
test("discipline and loss-sequence analytics do not invent missing labels", () => {
  const a = analyze(
    [
      fixture("l", -20, "2026-11-02T15:00:00Z", {
        followed_plan: null,
        emotion_before: "",
      }),
      fixture("w", 40, "2026-11-03T15:00:00Z"),
    ],
    "America/Toronto",
  );
  assert.equal(a.afterLoss[0].name, "After 1 loss");
  assert.equal(a.afterLoss[0].net, 40);
  assert.equal(a.emotions.length, 1);
  assert.equal(a.plan.length, 1);
});
