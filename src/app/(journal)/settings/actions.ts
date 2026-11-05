"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
export async function saveSettings(input: unknown) {
  const { user, supabase } = await requireUser();
  const parsed = z
    .object({
      display_name: z.string().trim().max(100),
      timezone: z.string().max(100),
      currency: z.enum(["USD", "CAD", "EUR", "GBP", "JPY", "AUD"]),
      theme: z.enum(["dark", "light", "system"]),
      screenshot_limit_mb: z.number().int().min(1).max(10),
    })
    .safeParse(input);
  if (!parsed.success)
    return { error: "Check your profile and preference values." };
  try {
    new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone });
  } catch {
    return { error: "Choose a valid IANA timezone, such as America/Toronto." };
  }
  const { display_name, ...settings } = parsed.data;
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name });
  if (profileError) return { error: "Could not update your profile." };
  const { error } = await supabase
    .from("application_settings")
    .upsert({ ...settings, user_id: user.id });
  if (error)
    return {
      error:
        "Profile updated, but preferences could not be saved. Please retry.",
    };
  revalidatePath("/", "layout");
  return { success: true };
}
export async function addInstrument(input: unknown) {
  const { user, supabase } = await requireUser();
  const parsed = z
    .object({
      symbol: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{1,16}$/),
      name: z.string().trim().min(1).max(100),
      tick_size: z.number().finite().positive().max(100000),
      point_value: z.number().finite().positive().max(10000000),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error:
        "Enter a symbol, name, positive tick size, and positive point value.",
    };
  const { data: defaults } = await supabase
    .from("futures_contract_specs")
    .select("id")
    .eq("symbol", parsed.data.symbol)
    .is("user_id", null);
  if (defaults?.length)
    return { error: "A standard instrument already uses that symbol." };
  const { error } = await supabase
    .from("futures_contract_specs")
    .insert({ ...parsed.data, user_id: user.id });
  if (error)
    return { error: "Could not add instrument. Its symbol may already exist." };
  revalidatePath("/", "layout");
  return { success: true };
}
export async function deleteAllJournalData(confirmation: string) {
  const { supabase, user } = await requireUser();
  if (confirmation !== "DELETE MY JOURNAL")
    return { error: "Type DELETE MY JOURNAL to confirm." };
  // Enumerate all objects, including interrupted uploads, beneath this user's prefix.
  async function collect(prefix: string): Promise<string[]> {
    const paths: string[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage
        .from("screenshots")
        .list(prefix, {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error)
        throw new Error(
          "Could not read your screenshot storage. Nothing was deleted.",
        );
      for (const item of data) {
        const path = `${prefix}/${item.name}`;
        if (item.id) paths.push(path);
        else paths.push(...(await collect(path)));
      }
      if (data.length < 100) break;
      offset += 100;
    }
    return paths;
  }
  try {
    const paths = await collect(user.id);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage
        .from("screenshots")
        .remove(paths.slice(i, i + 100));
      if (error)
        return {
          error:
            "Screenshot removal was interrupted. Some images may be removed; retry to finish. Journal records remain.",
        };
    }
    const { error } = await supabase.rpc("delete_journal_data");
    if (error)
      return {
        error:
          "Screenshots were removed, but journal records could not be deleted. Check the migration and retry.",
      };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not delete data.",
    };
  }
  revalidatePath("/", "layout");
  return { success: true };
}
