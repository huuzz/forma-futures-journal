import { getWorkspace } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { SettingsView } from "@/components/settings";
export default async function SettingsPage() {
  const { settings, specs } = await getWorkspace();
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  return (
    <SettingsView
      settings={settings}
      specs={specs}
      displayName={profile?.display_name || ""}
      email={user.email || ""}
    />
  );
}
