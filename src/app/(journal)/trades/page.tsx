import Link from "next/link";
import { Plus } from "lucide-react";
import { getWorkspace } from "@/lib/data";
import { TradeHistory } from "@/components/trade-history";
import { Button } from "@/components/ui/button";
export default async function Trades() {
  const { trades, settings } = await getWorkspace();
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">EVERY EXECUTION. EVERY LESSON.</p>
          <h1 className="page-title">Trade history</h1>
          <p className="page-description">
            Review the details behind your performance. {trades.length} saved
            trades.
          </p>
        </div>
        <Button asChild>
          <Link href="/trades/new">
            <Plus className="size-4" />
            Add trade
          </Link>
        </Button>
      </div>
      <TradeHistory trades={trades} settings={settings} />
    </>
  );
}
