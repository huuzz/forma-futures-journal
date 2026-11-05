import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/data";
import { TradeForm } from "@/components/trade-form";
export default async function TradeDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { trades, settings, specs } = await getWorkspace();
  const trade = trades.find((t) => t.id === id);
  if (!trade) notFound();
  return (
    <TradeForm key={trade.id} trade={trade} settings={settings} specs={specs} />
  );
}
