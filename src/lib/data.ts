import "server-only";
import { localStore } from "@/lib/local-store";
export async function getWorkspace() {
  const store = localStore();
  const data = await store.read();
  return {
    ...data,
    trades: data.trades.sort((a, b) =>
      b.trade_date.localeCompare(a.trade_date),
    ),
    journals: data.journals.sort((a, b) =>
      b.entry_date.localeCompare(a.entry_date),
    ),
    storagePath: store.directory,
  };
}
