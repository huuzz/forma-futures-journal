import { z } from "zod";
const numeric = z.number().finite().nullable();
export const tradeInput = z.object({
  id: z.uuid(),
  submission_id: z.uuid(),
  trade_date: z.iso.date(),
  symbol: z.string().min(1).max(16),
  direction: z.enum(["long", "short"]),
  status: z.enum(["draft", "open", "closed"]),
  contract_expiration: z.string().max(30).nullable(),
  entry_at: z.iso.datetime({ offset: true }).nullable(),
  exit_at: z.iso.datetime({ offset: true }).nullable(),
  entry_price: numeric,
  stop_price: numeric,
  target_price: numeric,
  exit_price: numeric,
  contracts: numeric,
  commission: z.number().finite(),
  fees: z.number().finite(),
  adjustment: z.number().finite(),
  adjustment_reason: z.string().max(2000),
  notes: z.record(z.string(), z.string().max(20000)),
  emotion_before: z.string().max(60),
  emotion_during: z.string().max(60),
  emotion_after: z.string().max(60),
  confidence: z.number().int().min(1).max(5).nullable(),
  followed_plan: z.boolean().nullable(),
  mistakes: z.array(z.string().min(1).max(60)).max(30),
});
export const journalInput = z.object({
  id: z.uuid(),
  entry_date: z.iso.date(),
  content: z.record(z.string(), z.string().max(30000)),
});
export const settingsInput = z.object({
  display_name: z.string().trim().max(100),
  timezone: z
    .string()
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Choose a valid timezone."),
  currency: z.enum(["USD", "CAD", "EUR", "GBP", "JPY", "AUD"]),
  theme: z.enum(["dark", "light", "system"]),
  screenshot_limit_mb: z.number().int().min(1).max(10),
});
export const specInput = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,16}$/),
  name: z.string().trim().min(1).max(100),
  tick_size: z.number().finite().positive().max(100000),
  point_value: z.number().finite().positive().max(10000000),
});
