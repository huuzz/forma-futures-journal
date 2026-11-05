"use server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function registerScreenshot(input: unknown) {
  const { supabase, user } = await requireUser();
  const parsed = z
    .object({
      kind: z.enum(["trade", "journal"]),
      recordId: z.uuid(),
      path: z.string().max(500),
      caption: z.string().max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid attachment." };
  const { kind, recordId, path, caption } = parsed.data;
  if (
    !path.startsWith(`${user.id}/${kind}/${recordId}/`) ||
    path.includes("..")
  )
    return { error: "Invalid screenshot path." };
  const { data: object, error: objectError } = await supabase.storage
    .from("screenshots")
    .info(path);
  if (objectError || !object)
    return { error: "Screenshot upload could not be verified." };
  const { data: preferences } = await supabase
    .from("application_settings")
    .select("screenshot_limit_mb")
    .eq("user_id", user.id)
    .single();
  const maxBytes = Number(preferences?.screenshot_limit_mb || 10) * 1024 * 1024;
  if (
    typeof object.size !== "number" ||
    object.size > maxBytes ||
    !["image/png", "image/jpeg", "image/webp"].includes(
      object.contentType || "",
    )
  )
    return {
      error: "Screenshot type or size does not match your preferences.",
    };
  const table = kind === "trade" ? "trade_screenshots" : "journal_screenshots";
  const reference = kind === "trade" ? "trade_id" : "journal_id";
  const { error } = await supabase
    .from(table)
    .upsert(
      { user_id: user.id, [reference]: recordId, object_path: path, caption },
      { onConflict: "object_path" },
    );
  if (error)
    return { error: "Could not associate screenshot with this record." };
  revalidatePath("/", "layout");
  return { success: true };
}
export async function updateScreenshotCaption(
  kind: "trade" | "journal",
  id: string,
  caption: string,
) {
  const { supabase, user } = await requireUser();
  if (
    !["trade", "journal"].includes(kind) ||
    !z.uuid().safeParse(id).success ||
    typeof caption !== "string" ||
    caption.length > 1000
  )
    return { error: "Invalid screenshot caption." };
  const table = kind === "trade" ? "trade_screenshots" : "journal_screenshots";
  const { error } = await supabase
    .from(table)
    .update({ caption })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) return { error: "Could not update screenshot caption." };
  revalidatePath("/", "layout");
  return { success: true };
}
export async function removeScreenshot(kind: "trade" | "journal", id: string) {
  const { supabase, user } = await requireUser();
  if (!["trade", "journal"].includes(kind) || !z.uuid().safeParse(id).success)
    return { error: "Invalid screenshot." };
  const table = kind === "trade" ? "trade_screenshots" : "journal_screenshots";
  const { data, error } = await supabase
    .from(table)
    .select("object_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error || !data) return { error: "Screenshot not found." };
  const { error: storageError } = await supabase.storage
    .from("screenshots")
    .remove([data.object_path]);
  if (storageError) return { error: "Could not remove screenshot." };
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (deleteError) return { error: "Could not remove screenshot metadata." };
  revalidatePath("/", "layout");
  return { success: true };
}
