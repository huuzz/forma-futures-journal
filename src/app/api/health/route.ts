import { NextResponse } from "next/server";
import { localStore } from "@/lib/local-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(
    {
      app: "forma-local",
      storagePath: localStore().directory,
      processId: process.pid,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
