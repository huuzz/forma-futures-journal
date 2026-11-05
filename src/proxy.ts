import { NextResponse, type NextRequest } from "next/server";
import { isLocalRequest } from "@/lib/local-request";
export function proxy(request: NextRequest) {
  if (
    !isLocalRequest(
      request.headers.get("host"),
      request.headers.get("origin"),
      request.method,
    )
  )
    return new NextResponse(
      "This personal journal accepts only local, same-origin requests.",
      { status: 403 },
    );
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
