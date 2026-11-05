export function dayKey(value: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function localDateTime(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function zonedIso(local: string, timezone: string) {
  const nominal = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(nominal)) throw new Error("Invalid execution time.");
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const instant = nominal + delta;
    const formatted = localDateTime(new Date(instant).toISOString(), timezone);
    offsets.add(Date.parse(`${formatted}:00Z`) - instant);
  }
  const matches = [...offsets]
    .map((offset) => nominal - offset)
    .filter(
      (instant) =>
        localDateTime(new Date(instant).toISOString(), timezone) === local,
    )
    .sort((a, b) => a - b);
  if (!matches.length)
    throw new Error(
      "This local time does not exist because of daylight saving time. Choose another time.",
    );
  return new Date(matches[0]).toISOString();
}
