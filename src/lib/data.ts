import "server-only";
import { requireUser } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  type Trade,
  type JournalEntry,
  type Settings,
  type ContractSpec,
} from "@/lib/calculations";
import { paginate } from "@/lib/paginate";
export async function getWorkspace() {
  const { supabase, user } = await requireUser();
  const [trades, journals, settings, specs] = await Promise.all([
    paginate((offset, size) =>
      supabase
        .from("trades")
        .select("*,trade_screenshots(id,object_path,caption)")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false })
        .order("id")
        .range(offset, offset + size - 1),
    ),
    paginate((offset, size) =>
      supabase
        .from("journal_entries")
        .select("*,journal_screenshots(id,object_path,caption)")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .order("id")
        .range(offset, offset + size - 1),
    ),
    supabase
      .from("application_settings")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase.from("futures_contract_specs").select("*").order("symbol"),
  ]);
  for (const result of [settings, specs])
    if (result.error)
      throw new Error(
        "Could not load your journal. Check your connection and database migration.",
      );
  return {
    trades: trades as Trade[],
    journals: journals as JournalEntry[],
    settings: { ...DEFAULT_SETTINGS, ...settings.data } as Settings,
    specs: specs.data as ContractSpec[],
  };
}
