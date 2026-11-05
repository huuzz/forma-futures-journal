"use server";
import { revalidatePath } from "next/cache";
import { localStore } from "@/lib/local-store";
import { mutationError } from "@/lib/mutation-error";
export async function saveSettings(input: unknown) {
  try {
    await localStore().saveSettings(input);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
export async function addInstrument(input: unknown) {
  try {
    await localStore().addInstrument(input);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
export async function deleteAllJournalData(confirmation: string) {
  try {
    await localStore().deleteAll(confirmation);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
