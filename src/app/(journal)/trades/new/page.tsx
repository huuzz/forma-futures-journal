import { getWorkspace } from "@/lib/data";
import { TradeForm } from "@/components/trade-form";
export default async function NewTrade() {
  const { settings, specs } = await getWorkspace();
  return <TradeForm settings={settings} specs={specs} />;
}
