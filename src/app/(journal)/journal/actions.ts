"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
export async function saveJournal(input: unknown) {
  const { user, supabase } = await requireUser();
  const parsed = z
    .object({
      id: z.uuid(),
      entry_date: z.iso.date(),
      content: z.record(z.string(), z.string().max(30000)),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error:
        "Enter a valid date and keep each section under 30,000 characters.",
    };
  const { data: existing, error: lookupError } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", parsed.data.entry_date)
    .maybeSingle();
  if (lookupError)
    return { error: "Could not check this date. Please try again." };
  if (existing && existing.id !== parsed.data.id)
    return {
      error:
        "A reflection already exists for this date. Open that entry to edit it.",
    };
  const { data: owned } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const result = owned
    ? await supabase
        .from("journal_entries")
        .update(parsed.data)
        .eq("id", owned.id)
        .eq("user_id", user.id)
        .select("id")
        .single()
    : await supabase
        .from("journal_entries")
        .insert({ ...parsed.data, user_id: user.id })
        .select("id")
        .single();
  if (result.error)
    return {
      error:
        "Could not save this reflection. Check the date and your connection.",
    };
  revalidatePath("/", "layout");
  return { id: result.data.id as string };
}
export async function deleteJournal(id: string) {
  const { user, supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return { error: "Invalid entry." };
  const { data: images, error: lookupError } = await supabase
    .from("journal_screenshots")
    .select("object_path")
    .eq("journal_id", id)
    .eq("user_id", user.id);
  if (lookupError) return { error: "Could not load screenshots." };
  if (images?.length) {
    const { error } = await supabase.storage
      .from("screenshots")
      .remove(images.map((i) => i.object_path));
    if (error) return { error: "Could not remove screenshots." };
  }
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Could not delete reflection." };
  revalidatePath("/", "layout");
  return { success: true };
}
