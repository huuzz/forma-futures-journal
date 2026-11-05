import { getWorkspace } from "@/lib/data";
import { Journal } from "@/components/journal";
import { z } from "zod";
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { journals, settings } = await getWorkspace();
  const { date } = await searchParams;
  const parsed = z.iso.date().safeParse(date);
  return (
    <Journal
      entries={journals}
      settings={settings}
      date={parsed.success ? parsed.data : undefined}
    />
  );
}
