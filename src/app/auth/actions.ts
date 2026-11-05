"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicConfig } from "@/lib/config";
import { authInput } from "@/lib/auth-validation";
export type AuthState = { error?: string; message?: string };
export async function authenticate(
  mode: string,
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!publicConfig())
    return {
      error: "Connect your Supabase project first. Open the setup guide.",
    };
  const parsed = authInput(mode, {
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = configuredOrigin || requestHeaders.get("origin");
  if (!origin)
    return { error: "Set NEXT_PUBLIC_SITE_URL to the application URL." };
  if (mode === "reset") {
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${origin}/auth/callback?next=/update-password` },
    );
    return error
      ? { error: error.message }
      : {
          message:
            "If that account exists, a password reset link is on its way.",
        };
  }
  if (!parsed.data.password)
    return { error: "Enter a password with at least 8 characters." };
  const credentials = {
    email: parsed.data.email,
    password: parsed.data.password,
  };
  if (mode === "signup") {
    const name = String(form.get("display_name") || "")
      .trim()
      .slice(0, 100);
    const { error } = await supabase.auth.signUp({
      ...credentials,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    return error
      ? { error: error.message }
      : { message: "Check your email to confirm your account, then sign in." };
  }
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error)
    return { error: "Unable to sign in. Check your email and password." };
  redirect("/dashboard");
}
export async function updatePassword(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const password = z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128)
    .safeParse(form.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (form.get("confirm_password") !== password.data)
    return { error: "Passwords do not match." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
export async function signOut() {
  if (publicConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
