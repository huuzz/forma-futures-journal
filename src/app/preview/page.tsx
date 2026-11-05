import Link from "next/link";
import { Shell } from "@/components/shell";
import { Dashboard } from "@/components/dashboard";
import { TradeForm } from "@/components/trade-form";
import { CONTRACTS, DEFAULT_SETTINGS } from "@/lib/calculations";
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return (
    <Shell setup>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-accent/30 px-4 py-3 text-[11px]">
        <p>Interface preview · no account data is loaded or saved here.</p>
        <Link href="/setup" className="text-primary">
          Connect your Supabase workspace →
        </Link>
      </div>
      <nav aria-label="Interface preview" className="mb-6 flex gap-4 text-xs">
        <Link className="text-primary" href="/preview">
          Dashboard preview
        </Link>
        <Link className="text-primary" href="/preview?view=trade">
          Try the trade form
        </Link>
      </nav>
      {view === "trade" ? (
        <TradeForm preview settings={DEFAULT_SETTINGS} specs={CONTRACTS} />
      ) : (
        <Dashboard trades={[]} settings={DEFAULT_SETTINGS} />
      )}
    </Shell>
  );
}
