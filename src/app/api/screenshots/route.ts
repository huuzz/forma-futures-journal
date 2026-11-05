import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { localStore } from "@/lib/local-store";
import { mutationError } from "@/lib/mutation-error";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 11 * 1024 * 1024)
    return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Select an image." }, { status: 400 });
    await localStore().saveScreenshot({
      kind: String(form.get("kind")) as "trade" | "journal",
      recordId: String(form.get("recordId")),
      id: String(form.get("id")),
      caption: String(form.get("caption") || ""),
      mime: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: mutationError(error) }, { status: 400 });
  }
}
