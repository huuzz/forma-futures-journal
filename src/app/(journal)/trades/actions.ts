"use server";
import { revalidatePath } from "next/cache";
import { localStore } from "@/lib/local-store";
import { mutationError } from "@/lib/mutation-error";
export async function saveTrade(input: unknown) {
  try {
    const id = await localStore().saveTrade(input);
    revalidatePath("/", "layout");
    return { id };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
export async function deleteTrade(id: string) {
  try {
    await localStore().deleteTrade(id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { error: mutationError(error) };
  }
}
