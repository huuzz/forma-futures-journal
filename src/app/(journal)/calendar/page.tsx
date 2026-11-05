import { getWorkspace } from "@/lib/data";
import { TradingCalendar } from "@/components/trading-calendar";
export default async function CalendarPage() {
  const { trades, journals, settings } = await getWorkspace();
  return (
    <TradingCalendar trades={trades} journals={journals} settings={settings} />
  );
}
