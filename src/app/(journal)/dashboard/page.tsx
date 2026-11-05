import { getWorkspace } from "@/lib/data";
import { Dashboard } from "@/components/dashboard";
export default async function DashboardPage() {
  const { trades, settings } = await getWorkspace();
  return <Dashboard trades={trades} settings={settings} />;
}
