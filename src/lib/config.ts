type Environment = Record<string, string | undefined>;
export function getConfig(
  env: Environment,
): { url: string; key: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key?.trim()) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
export function publicConfig() {
  return getConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
export function safeNext(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.includes("\\") ||
      decoded.startsWith("//") ||
      /^\/(auth|login|signup|reset-password|setup)(\/|$|\?)/.test(decoded)
    )
      return "/dashboard";
    const target = new URL(decoded, "https://journal.local");
    return target.origin === "https://journal.local"
      ? target.pathname + target.search
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
