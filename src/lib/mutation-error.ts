import { ZodError } from "zod";
export function mutationError(error: unknown) {
  if (error instanceof ZodError)
    return error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" ");
  return error instanceof Error
    ? error.message
    : "Could not save your local journal. Check your data folder and try again.";
}
