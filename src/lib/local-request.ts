export function isLocalRequest(
  host: string | null,
  origin: string | null,
  method: string,
): boolean {
  if (!host || !/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host))
    return false;
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return true;
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      url.host === host &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}
