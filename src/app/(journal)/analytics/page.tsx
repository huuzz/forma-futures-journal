import { getWorkspace } from "@/lib/data";
import { Analytics } from "@/components/analytics";
export default async function AnalyticsPage() {
  const { trades, settings } = await getWorkspace();
  return <Analytics trades={trades} settings={settings} />;
}
