"use client";
export type DateRange = { preset: string; start: string; end: string };
export const initialRange: DateRange = {
  preset: "All Time",
  start: "",
  end: "",
};
export function DateFilter({
  range,
  setRange,
}: {
  range: DateRange;
  setRange: (r: DateRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Performance date range"
        className="w-auto min-w-40 text-xs"
        value={range.preset}
        onChange={(e) => setRange({ ...range, preset: e.target.value })}
      >
        {[
          "Today",
          "This Week",
          "This Month",
          "Last 30 Days",
          "Last 90 Days",
          "All Time",
          "Custom Date Range",
        ].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      {range.preset === "Custom Date Range" && (
        <>
          <input
            aria-label="Start date"
            type="date"
            className="w-auto"
            value={range.start}
            onChange={(e) => setRange({ ...range, start: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            aria-label="End date"
            type="date"
            className="w-auto"
            value={range.end}
            onChange={(e) => setRange({ ...range, end: e.target.value })}
          />
          {range.start && range.end && range.start > range.end && (
            <p className="text-xs text-loss" role="alert">
              Start date must precede end date.
            </p>
          )}
        </>
      )}
    </div>
  );
}
