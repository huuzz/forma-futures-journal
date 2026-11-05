"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  Save,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ImagePicker,
  ScreenshotGallery,
  uploadImages,
  type PendingImage,
} from "@/components/screenshots";
import { saveJournal, deleteJournal } from "@/app/(journal)/journal/actions";
import { dayKey } from "@/lib/dates";
import type { JournalEntry, Settings } from "@/lib/calculations";
const fields = [
  ["market_outlook", "Market outlook"],
  ["premarket_thoughts", "Pre-market thoughts"],
  ["trading_plan", "Trading plan"],
  ["goals", "Goals for the day"],
  ["emotional_state", "Emotional state"],
  ["trading_mistakes", "Trading mistakes"],
  ["lessons_learned", "Lessons learned"],
  ["reflection", "End-of-day reflection"],
  ["general_notes", "General notes"],
] as const;
export function Journal({
  entries,
  settings,
  date,
}: {
  entries: JournalEntry[];
  settings: Settings;
  date?: string;
}) {
  const today = dayKey(new Date(), settings.timezone);
  const [selected, setSelected] = useState(
    date || entries[0]?.entry_date || today,
  );
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const entry = entries.find((e) => e.entry_date === selected);
  const filtered = entries.filter((e) =>
    `${e.entry_date} ${Object.values(e.content).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">MAKE ROOM FOR REFLECTION</p>
          <h1 className="page-title">Trading journal</h1>
          <p className="page-description">
            A space for your outlook, your process, and what you learned along
            the way.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelected(today);
          }}
        >
          <Plus className="size-4" />
          New reflection
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="p-4">
          <div className="relative mb-5">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              className="pl-9"
              aria-label="Search journal entries"
              placeholder="Search reflections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="eyebrow mb-3">{filtered.length} REFLECTIONS</p>
          <div className="max-h-[650px] space-y-1 overflow-auto">
            {filtered.map((e) => (
              <button
                key={e.id}
                className={`block w-full rounded-lg p-3 text-left ${e.entry_date === selected ? "bg-accent" : "hover:bg-muted"}`}
                onClick={() => {
                  setSelected(e.entry_date);
                }}
              >
                <p className="flex items-center gap-2 text-xs font-medium">
                  <BookOpen className="size-3.5 text-primary" />
                  {e.entry_date}
                </p>
                <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-muted-foreground">
                  {e.content.reflection ||
                    e.content.market_outlook ||
                    e.content.general_notes ||
                    "Daily reflection"}
                </p>
              </button>
            ))}
            {!filtered.length && (
              <p className="py-7 text-xs leading-6 text-muted-foreground">
                {entries.length
                  ? "No matching reflections."
                  : "Your reflections will appear here. Start with what’s on your mind today."}
              </p>
            )}
          </div>
        </Card>
        <JournalEditor
          key={`${selected}-${version}`}
          entry={entry}
          initialDate={selected}
          settings={settings}
          onSaved={(date) => {
            setSelected(date);
          }}
          onDeleted={() => {
            setSelected(today);
            setVersion((n) => n + 1);
          }}
        />
      </div>
    </>
  );
}
function JournalEditor({
  entry,
  initialDate,
  settings,
  onSaved,
  onDeleted,
}: {
  entry?: JournalEntry;
  initialDate: string;
  settings: Settings;
  onSaved: (date: string) => void;
  onDeleted: () => void;
}) {
  const [id] = useState(() => entry?.id || crypto.randomUUID());
  const [date, setDate] = useState(entry?.entry_date || initialDate);
  const [content, setContent] = useState<Record<string, string>>(
    entry?.content || {},
  );
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setError("");
        setMessage("");
        startTransition(async () => {
          try {
            const result = await saveJournal({ id, entry_date: date, content });
            if (result.error) {
              setError(result.error);
              return;
            }
            const failed = await uploadImages("journal", id, images);
            setImages(failed);
            if (failed.length)
              setError(
                `Reflection saved. ${failed.length} screenshot(s) need another upload attempt.`,
              );
            else setMessage("Reflection saved.");
            if (!failed.length) onSaved(date);
            router.refresh();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Could not save reflection.",
            );
          } finally {
            lock.current = false;
          }
        });
      }}
      className="space-y-6"
    >
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>
              {entry ? "Daily reflection" : "A new perspective"}
            </CardTitle>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Write honestly. Look for lessons, not perfect answers.
            </p>
          </div>
          <label>
            Date
            <input
              type="date"
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label
              key={key}
              className={key === "reflection" ? "sm:col-span-2" : ""}
            >
              {label}
              <textarea
                className={key === "reflection" ? "min-h-40" : ""}
                maxLength={30000}
                placeholder={
                  key === "reflection"
                    ? "How did today compare with your plan? What will you carry forward?"
                    : "Your thoughts…"
                }
                value={content[key] || ""}
                onChange={(e) =>
                  setContent({ ...content, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>Daily screenshots</CardTitle>
        <div className="mt-5">
          {entry?.journal_screenshots && (
            <div className="mb-5">
              <ScreenshotGallery
                kind="journal"
                images={entry.journal_screenshots}
                editable
                limitMb={settings.screenshot_limit_mb}
                onChange={() => router.refresh()}
              />
            </div>
          )}
          <ImagePicker
            images={images}
            setImages={setImages}
            limitMb={settings.screenshot_limit_mb}
          />
        </div>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {error && (
            <p role="alert" className="text-xs text-loss">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-xs text-profit">
              {message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {entry && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (
                  !confirm(
                    "Permanently delete this daily reflection and its screenshots?",
                  )
                )
                  return;
                startTransition(async () => {
                  const result = await deleteJournal(id);
                  if (result.error) setError(result.error);
                  else {
                    onDeleted();
                    router.refresh();
                  }
                });
              }}
            >
              <Trash2 className="size-4 text-loss" />
              Delete
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save reflection
          </Button>
        </div>
      </div>
    </form>
  );
}
