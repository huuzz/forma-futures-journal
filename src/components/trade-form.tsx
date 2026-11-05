"use client";
import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Save,
  LoaderCircle,
  ArrowUpRight,
  Calculator,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  calculateTrade,
  validateTrade,
  money,
  number,
  type Trade,
  type Settings,
  type ContractSpec,
} from "@/lib/calculations";
import { dayKey, localDateTime, zonedIso } from "@/lib/dates";
import { saveTrade, deleteTrade } from "@/app/(journal)/trades/actions";
import {
  ImagePicker,
  ScreenshotGallery,
  uploadImages,
  type PendingImage,
} from "@/components/screenshots";
const noteFields = [
  ["reason", "Reason for taking the trade"],
  ["market", "Market conditions"],
  ["well", "What went well"],
  ["wrong", "What went wrong"],
  ["lessons", "Lessons learned"],
  ["general", "General notes"],
] as const;
const mistakeSuggestions = [
  "FOMO",
  "Revenge Trading",
  "Overtrading",
  "Early Entry",
  "Late Entry",
  "Early Exit",
  "Oversizing",
  "Moving Stop Loss",
  "Breaking Trading Rules",
];
function initialTrade(settings: Settings, spec: ContractSpec): Trade {
  return {
    id: crypto.randomUUID(),
    submission_id: crypto.randomUUID(),
    user_id: "",
    trade_date: dayKey(new Date(), settings.timezone),
    entry_at: null,
    exit_at: null,
    symbol: spec.symbol,
    tick_size: Number(spec.tick_size),
    point_value: Number(spec.point_value),
    direction: "long",
    status: "closed",
    entry_price: null,
    stop_price: null,
    target_price: null,
    exit_price: null,
    contracts: null,
    commission: 0,
    fees: 0,
    adjustment: 0,
    adjustment_reason: "",
    contract_expiration: "",
    notes: {},
    emotion_before: "",
    emotion_during: "",
    emotion_after: "",
    confidence: null,
    followed_plan: null,
    mistakes: [],
    created_at: "",
    updated_at: "",
  };
}
export function TradeForm({
  trade,
  specs,
  settings,
  preview = false,
}: {
  trade?: Trade;
  specs: ContractSpec[];
  settings: Settings;
  preview?: boolean;
}) {
  const [value, setValue] = useState<Trade>(
    () =>
      trade ||
      initialTrade(settings, specs.find((s) => s.symbol === "NQ") || specs[0]),
  );
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const router = useRouter();
  const [saved, setSaved] = useState(!!trade);
  const [customMistake, setCustomMistake] = useState("");
  const metrics = calculateTrade(value);
  function update<K extends keyof Trade>(key: K, v: Trade[K]) {
    setValue((current) => ({ ...current, [key]: v }));
  }
  const numericFields = [
    ["entry_price", "Entry price"],
    ["stop_price", "Initial stop loss"],
    ["target_price", "Take profit"],
    ["exit_price", "Exit price"],
    ["contracts", "Contracts"],
    ["commission", "Commission ($ total)"],
    ["fees", "Fees ($ total)"],
    ["adjustment", "Manual adjustment ($)"],
  ] as const;
  async function submit(draft = false) {
    if (preview) {
      setMessage("Preview only. Connect Supabase to save your trades.");
      return;
    }
    if (locked.current) return;
    locked.current = true;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const payload = {
          ...value,
          status: draft ? ("draft" as const) : value.status,
        };
        const issues = validateTrade(payload);
        if (issues.length) {
          setError(issues.join(" "));
          return;
        }
        const result = await saveTrade(payload);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        setValue(payload);
        const failed = await uploadImages("trade", value.id, images);
        setImages(failed);
        if (failed.length) {
          setError(
            `Trade saved. ${failed.length} screenshot(s) could not upload. Retry Save to upload the remaining images.`,
          );
          router.refresh();
          return;
        }
        setMessage("Trade saved.");
        router.push(`/trades/${value.id}`);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to save. Your entry is still here; please retry.",
        );
      } finally {
        locked.current = false;
      }
    });
  }
  return (
    <>
      <Link
        href="/trades"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Trade history
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">
            CAPTURE THE TRADE. UNDERSTAND THE PROCESS.
          </p>
          <h1 className="page-title">
            {trade ? "Trade details" : "Journal a trade"}
          </h1>
          <p className="page-description">
            The numbers tell one story. Your notes tell the rest.
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {value.status} trade
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <Card>
              <CardTitle>
                01 <span className="ml-3">Trade information</span>
              </CardTitle>
              <p className="mb-6 mt-2 text-xs text-muted-foreground">
                Record one entry, one exit, and one contract quantity.
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <label>
                  Trade date
                  <input
                    required
                    type="date"
                    value={value.trade_date}
                    onChange={(e) => update("trade_date", e.target.value)}
                  />
                </label>
                <label>
                  Instrument
                  <select
                    value={value.symbol}
                    onChange={(e) => {
                      const spec = specs.find(
                        (s) => s.symbol === e.target.value,
                      )!;
                      setValue({
                        ...value,
                        symbol: spec.symbol,
                        tick_size: Number(spec.tick_size),
                        point_value: Number(spec.point_value),
                      });
                    }}
                  >
                    {specs.map((spec) => (
                      <option key={spec.id || spec.symbol} value={spec.symbol}>
                        {spec.symbol} · {spec.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Direction
                  <select
                    value={value.direction}
                    onChange={(e) =>
                      update("direction", e.target.value as Trade["direction"])
                    }
                  >
                    <option value="long">Long ↗</option>
                    <option value="short">Short ↘</option>
                  </select>
                </label>
                <label>
                  Entry time · {settings.timezone}
                  <input
                    type="datetime-local"
                    value={
                      value.entry_at
                        ? localDateTime(value.entry_at, settings.timezone)
                        : ""
                    }
                    onChange={(e) => {
                      try {
                        update(
                          "entry_at",
                          e.target.value
                            ? zonedIso(e.target.value, settings.timezone)
                            : null,
                        );
                        setError("");
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  />
                </label>
                <label>
                  Exit time · {settings.timezone}
                  <input
                    type="datetime-local"
                    value={
                      value.exit_at
                        ? localDateTime(value.exit_at, settings.timezone)
                        : ""
                    }
                    onChange={(e) => {
                      try {
                        update(
                          "exit_at",
                          e.target.value
                            ? zonedIso(e.target.value, settings.timezone)
                            : null,
                        );
                        setError("");
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={value.status}
                    onChange={(e) =>
                      update("status", e.target.value as Trade["status"])
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label>
                  Contract expiration{" "}
                  <span className="text-muted-foreground">(optional)</span>
                  <input
                    value={value.contract_expiration || ""}
                    maxLength={30}
                    placeholder="e.g. December 2026"
                    onChange={(e) =>
                      update("contract_expiration", e.target.value)
                    }
                  />
                </label>
              </div>
              <p className="mt-5 text-[10px] text-muted-foreground">
                For a repeated daylight-saving hour, the earlier occurrence is
                used. Realized performance is grouped by exit date in your
                trading timezone.
              </p>
            </Card>
            <Card>
              <CardTitle>
                02 <span className="ml-3">Execution & risk</span>
              </CardTitle>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {numericFields.map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      step={
                        key === "contracts"
                          ? 1
                          : ["commission", "fees", "adjustment"].includes(key)
                            ? "0.01"
                            : value.tick_size
                      }
                      min={key === "adjustment" ? undefined : 0}
                      value={value[key] ?? ""}
                      onChange={(e) =>
                        update(
                          key,
                          e.target.value === ""
                            ? ["commission", "fees", "adjustment"].includes(key)
                              ? 0
                              : null
                            : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="mt-5">
                Reason for manual adjustment
                <input
                  maxLength={2000}
                  value={value.adjustment_reason}
                  placeholder="Required when an adjustment is entered"
                  onChange={(e) => update("adjustment_reason", e.target.value)}
                />
              </label>
              <p className="mt-4 text-[11px] text-muted-foreground">
                {value.symbol} · Tick size {value.tick_size} · Tick value{" "}
                {money(value.tick_size * value.point_value)} · Point value{" "}
                {money(value.point_value)} per contract
              </p>
            </Card>
            <Card>
              <CardTitle>
                03 <span className="ml-3">Chart screenshots</span>
              </CardTitle>
              <p className="mb-5 mt-2 text-xs text-muted-foreground">
                Capture the context before it fades. Images remain private.
              </p>
              {trade?.trade_screenshots && (
                <div className="mb-4">
                  <ScreenshotGallery
                    images={trade.trade_screenshots}
                    kind="trade"
                    editable
                    limitMb={settings.screenshot_limit_mb}
                    onChange={() => router.refresh()}
                  />
                </div>
              )}
              <ImagePicker
                images={images}
                setImages={setImages}
                limitMb={settings.screenshot_limit_mb}
              />
            </Card>
            <Card>
              <CardTitle>
                04 <span className="ml-3">Trade reflection</span>
              </CardTitle>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {noteFields.map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      maxLength={20000}
                      placeholder="Write your observations…"
                      value={value.notes[key] || ""}
                      onChange={(e) =>
                        update("notes", {
                          ...value.notes,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle>
                05 <span className="ml-3">Psychology & discipline</span>
              </CardTitle>
              <datalist id="emotions">
                {[
                  "Calm",
                  "Confident",
                  "Focused",
                  "Anxious",
                  "Frustrated",
                  "Excited",
                  "Fearful",
                  "Impatient",
                ].map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </datalist>
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                {(["before", "during", "after"] as const).map((when) => (
                  <label key={when}>
                    Emotion {when}
                    <input
                      maxLength={60}
                      list="emotions"
                      placeholder="Choose or type your own"
                      value={value[`emotion_${when}`]}
                      onChange={(e) =>
                        update(`emotion_${when}`, e.target.value)
                      }
                    />
                  </label>
                ))}
                <label>
                  Confidence
                  <select
                    value={value.confidence ?? ""}
                    onChange={(e) =>
                      update(
                        "confidence",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">Not recorded</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Followed trading plan?
                  <select
                    value={
                      value.followed_plan === null
                        ? ""
                        : String(value.followed_plan)
                    }
                    onChange={(e) =>
                      update(
                        "followed_plan",
                        e.target.value === ""
                          ? null
                          : e.target.value === "true",
                      )
                    }
                  >
                    <option value="">Not recorded</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
              </div>
              <p className="mb-3 mt-6 text-xs">Mistakes observed</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...mistakeSuggestions, ...value.mistakes])].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={value.mistakes.includes(tag)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] ${value.mistakes.includes(tag) ? "border-primary/40 bg-accent text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      onClick={() =>
                        update(
                          "mistakes",
                          value.mistakes.includes(tag)
                            ? value.mistakes.filter((m) => m !== tag)
                            : [...value.mistakes, tag],
                        )
                      }
                    >
                      {value.mistakes.includes(tag) && "✓ "}
                      {tag}
                    </button>
                  ),
                )}
              </div>
              <div className="mt-4 flex max-w-sm gap-2">
                <input
                  aria-label="Custom mistake tag"
                  placeholder="Add a custom mistake…"
                  maxLength={60}
                  value={customMistake}
                  onChange={(e) => setCustomMistake(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tag = customMistake.trim();
                    if (tag && !value.mistakes.includes(tag))
                      update("mistakes", [...value.mistakes, tag]);
                    setCustomMistake("");
                  }}
                >
                  Add
                </Button>
              </div>
            </Card>
          </div>
          <aside className="space-y-4 xl:sticky xl:top-6">
            <Card className="border-primary/20">
              <div className="flex items-center justify-between">
                <CardTitle>Live trade summary</CardTitle>
                <Calculator className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Calculated from your execution details
              </p>
              <div className="my-6 border-y border-border py-5">
                <p className="eyebrow">NET REALIZED P&L</p>
                <p
                  className={`tabular mt-2 text-3xl font-medium tracking-tight ${(metrics.net ?? 0) < 0 ? "text-loss" : "text-profit"}`}
                >
                  {money(metrics.net, settings.currency)}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {value.status === "closed"
                    ? metrics.outcome || "Enter execution details"
                    : "Draft and open trades are not realized."}
                </p>
              </div>
              <dl className="space-y-4">
                {[
                  ["Gross P&L", money(metrics.gross, settings.currency)],
                  [
                    "Initial dollar risk",
                    money(metrics.risk, settings.currency),
                  ],
                  [
                    "Planned reward / risk",
                    metrics.plannedRR === null
                      ? "—"
                      : `${number(metrics.plannedRR)} : 1`,
                  ],
                  [
                    "Realized R-multiple",
                    metrics.realizedR === null
                      ? "—"
                      : `${number(metrics.realizedR)} R`,
                  ],
                  ["Points", number(metrics.points)],
                  ["Ticks", number(metrics.ticks)],
                  [
                    "Duration",
                    metrics.durationMinutes === null
                      ? "—"
                      : `${number(metrics.durationMinutes)} min`,
                  ],
                ].map(([label, result]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 text-xs"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular font-medium">{result}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="text-[11px] leading-6 text-muted-foreground">
              A good trade follows your process. Record what happened honestly,
              then look for patterns over time.
            </Card>
          </aside>
        </div>
        <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-4 backdrop-blur">
          <div className="max-w-2xl">
            {error && (
              <p role="alert" className="text-xs text-loss">
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="flex items-center gap-2 text-xs text-profit"
              >
                <Check className="size-4" />
                {message}
              </p>
            )}
            {!error && !message && (
              <p className="text-[11px] text-muted-foreground">
                {saved
                  ? "Your saved trade can be updated here."
                  : "Save a draft if you want to finish later."}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {saved && (
              <Button
                type="button"
                variant="ghost"
                aria-label="Delete trade"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      "Permanently delete this trade and its screenshots?",
                    )
                  )
                    return;
                  startTransition(async () => {
                    const result = await deleteTrade(value.id);
                    if (result.error) setError(result.error);
                    else {
                      router.push("/trades");
                      router.refresh();
                    }
                  });
                }}
              >
                <Trash2 className="size-4 text-loss" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void submit(true)}
            >
              <Save className="size-3.5" />
              Save draft
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
              {saved ? "Save changes" : "Save trade"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
