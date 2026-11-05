"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authenticate, updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
export function AuthForm({
  mode,
  error: initialError,
}: {
  mode: "login" | "signup" | "reset" | "update";
  error?: string;
}) {
  const action =
    mode === "update" ? updatePassword : authenticate.bind(null, mode);
  const [state, submit, pending] = useActionState(action, {});
  const titles = {
    login: "Welcome back.",
    signup: "Start a better trading habit.",
    reset: "Reset your password.",
    update: "Choose a new password.",
  };
  return (
    <div className="w-full max-w-sm">
      <p className="eyebrow mb-4">YOUR EDGE STARTS WITH REFLECTION</p>
      <h1 className="page-title">{titles[mode]}</h1>
      <p className="page-description mb-8">
        {mode === "login"
          ? "Your trades. Your process. A clearer perspective."
          : mode === "signup"
            ? "Create your private futures trading journal."
            : "Keep your journal secure and accessible."}
      </p>
      <form action={submit} className="space-y-5">
        {mode === "signup" && (
          <label>
            Display name
            <input
              name="display_name"
              autoComplete="name"
              maxLength={100}
              placeholder="Your name"
            />
          </label>
        )}
        {mode !== "update" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              maxLength={128}
              required
              placeholder="At least 8 characters"
            />
          </label>
        )}
        {mode === "update" && (
          <label>
            Confirm password
            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        )}
        {(state.error || initialError) && (
          <p
            role="alert"
            className="rounded-lg border border-loss/30 bg-loss/5 p-3 text-xs text-loss"
          >
            {state.error || initialError}
          </p>
        )}
        {state.message && (
          <p
            role="status"
            className="rounded-lg border border-profit/30 bg-profit/5 p-3 text-xs text-profit"
          >
            {state.message}
          </p>
        )}
        <Button className="w-full" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <>
              {mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : mode === "update"
                    ? "Update password"
                    : "Send reset link"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            <Link className="hover:text-foreground" href="/reset-password">
              Forgot password?
            </Link>
            <Link className="text-primary" href="/signup">
              Create an account ↗
            </Link>
          </>
        ) : (
          <Link className="text-primary" href="/login">
            ← Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
