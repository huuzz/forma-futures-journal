import { getWorkspace } from "@/lib/data";
import { SettingsView } from "@/components/settings";
export default async function SettingsPage() {
  const { settings, specs, profile, storagePath } = await getWorkspace();
  return (
    <SettingsView
      settings={settings}
      specs={specs}
      displayName={profile.display_name}
      storagePath={storagePath}
    />
  );
}
