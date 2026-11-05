"use server";
import { revalidatePath } from "next/cache";
import { localStore } from "@/lib/local-store";
import { mutationError } from "@/lib/mutation-error";
export async function saveJournal(input: unknown) {
  try {
    const id = await localStore().saveJournal(input);
    revalidatePath("/", "layout");
    return { id };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
export async function deleteJournal(id: string) {
  try {
    await localStore().deleteJournal(id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
