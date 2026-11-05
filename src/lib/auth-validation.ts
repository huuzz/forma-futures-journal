import { z } from "zod";
const schema = z
  .object({
    mode: z.enum(["login", "signup", "reset"]),
    email: z.email(),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.mode !== "reset" && !value.password)
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Enter a password with at least 8 characters.",
      });
  });
export function authInput(
  mode: string,
  input: { email: unknown; password?: unknown },
) {
  return schema.safeParse({
    mode,
    email: input.email,
    password: mode === "reset" ? undefined : input.password,
  });
}
