import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicConfig, safeNext } from "@/lib/config";
export async function GET(request: NextRequest) {
  if (!publicConfig())
    return NextResponse.redirect(new URL("/setup", request.url));
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          safeNext(request.nextUrl.searchParams.get("next")),
          request.url,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=Your+link+expired.+Please+try+again.", request.url),
  );
}
