"use server";
import { revalidatePath } from "next/cache";
import { localStore } from "@/lib/local-store";
import { mutationError } from "@/lib/mutation-error";
export async function updateScreenshotCaption(
  kind: "trade" | "journal",
  id: string,
  caption: string,
) {
  try {
    await localStore().updateCaption(kind, id, caption);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
export async function removeScreenshot(kind: "trade" | "journal", id: string) {
  try {
    await localStore().deleteScreenshot(kind, id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
