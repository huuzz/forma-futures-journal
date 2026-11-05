"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { validateTrade } from "@/lib/calculations";
const numeric = z.number().finite().nullable();
const tradeSchema = z.object({
  id: z.uuid(),
  submission_id: z.uuid(),
  trade_date: z.iso.date(),
  symbol: z.string().min(1).max(16),
  direction: z.enum(["long", "short"]),
  status: z.enum(["draft", "open", "closed"]),
  contract_expiration: z.string().max(30).nullable(),
  entry_at: z.iso.datetime({ offset: true }).nullable(),
  exit_at: z.iso.datetime({ offset: true }).nullable(),
  entry_price: numeric,
  stop_price: numeric,
  target_price: numeric,
  exit_price: numeric,
  contracts: numeric,
  commission: z.number().finite(),
  fees: z.number().finite(),
  adjustment: z.number().finite(),
  adjustment_reason: z.string().max(2000),
  notes: z.record(z.string(), z.string().max(20000)),
  emotion_before: z.string().max(60),
  emotion_during: z.string().max(60),
  emotion_after: z.string().max(60),
  confidence: z.number().int().min(1).max(5).nullable(),
  followed_plan: z.boolean().nullable(),
  mistakes: z.array(z.string().min(1).max(60)).max(30),
});
export async function saveTrade(input: unknown) {
  const { user, supabase } = await requireUser();
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    };
  const data = parsed.data;
  const { data: existing, error: existingError } = await supabase
    .from("trades")
    .select("id,tick_size,point_value,symbol")
    .eq("id", data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) return { error: "Could not check this trade. Try again." };
  let specification: { tick_size: number; point_value: number } | null = null;
  if (existing && existing.symbol === data.symbol) specification = existing;
  else {
    const { data: specs, error } = await supabase
      .from("futures_contract_specs")
      .select("tick_size,point_value,user_id")
      .eq("symbol", data.symbol);
    if (error) return { error: "Could not load instrument specifications." };
    specification =
      specs?.find((s) => s.user_id === user.id) ||
      specs?.find((s) => s.user_id === null) ||
      null;
  }
  if (!specification)
    return { error: "This instrument is not available in your workspace." };
  const payload = {
    ...data,
    tick_size: Number(specification.tick_size),
    point_value: Number(specification.point_value),
    user_id: user.id,
  };
  const errors = validateTrade(payload);
  if (errors.length) return { error: errors.join(" ") };
  const result = existing
    ? await supabase
        .from("trades")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select("id")
        .single()
    : await supabase.from("trades").insert(payload).select("id").single();
  if (result.error) {
    // A repeated initial submission is safe only when its owner/id match.
    if (result.error.code === "23505") {
      const { data: duplicate } = await supabase
        .from("trades")
        .select("id")
        .eq("user_id", user.id)
        .eq("submission_id", data.submission_id)
        .maybeSingle();
      if (duplicate?.id === data.id) return { id: duplicate.id };
    }
    return {
      error:
        "Trade could not be saved. Check its values and your connection, then retry.",
    };
  }
  revalidatePath("/", "layout");
  return { id: result.data.id as string };
}
export async function deleteTrade(id: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(id).success) return { error: "Invalid trade." };
  const { data: images, error: readError } = await supabase
    .from("trade_screenshots")
    .select("object_path")
    .eq("trade_id", id)
    .eq("user_id", user.id);
  if (readError) return { error: "Could not load attachments." };
  if (images?.length) {
    const { error } = await supabase.storage
      .from("screenshots")
      .remove(images.map((i) => i.object_path));
    if (error) return { error: "Could not remove screenshots. Please retry." };
  }
  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Could not delete trade." };
  revalidatePath("/", "layout");
  return { success: true };
}
