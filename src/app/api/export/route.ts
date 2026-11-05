import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/data";
import { calculateTrade } from "@/lib/calculations";
import { toCSV } from "@/lib/export";
export async function GET(request: NextRequest) {
  const { trades, journals, settings, specs } = await getWorkspace();
  const format = request.nextUrl.searchParams.get("format");
  const kind = request.nextUrl.searchParams.get("kind");
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="forma-${kind === "journal" ? "journal" : "trades"}.${format === "csv" ? "csv" : "json"}"`,
  };
  if (format === "csv")
    return new NextResponse(
      "\uFEFF" +
        toCSV(
          kind === "journal"
            ? journals.map((j) => ({
                date: j.entry_date,
                ...j.content,
                screenshots: j.journal_screenshots,
              }))
            : trades.map((t) => ({ ...t, ...calculateTrade(t) })),
        ),
      { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } },
    );
  return NextResponse.json(
    {
      exported_at: new Date().toISOString(),
      version: 1,
      trades: trades.map((t) => ({ ...t, calculations: calculateTrade(t) })),
      journal_entries: journals,
      settings,
      instruments: specs,
    },
    { headers },
  );
}
