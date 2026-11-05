import { getWorkspace } from "@/lib/data";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, settings } = await getWorkspace();
  return (
    <Shell name={profile.display_name} initialTheme={settings.theme}>
      {children}
    </Shell>
  );
}
