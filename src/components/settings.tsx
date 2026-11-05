"use client";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { Save, Download, Plus, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  saveSettings,
  addInstrument,
  deleteAllJournalData,
} from "@/app/(journal)/settings/actions";
import { money, type Settings, type ContractSpec } from "@/lib/calculations";
export function SettingsView({
  settings,
  specs,
  displayName,
  storagePath,
}: {
  settings: Settings;
  specs: ContractSpec[];
  displayName: string;
  storagePath: string;
}) {
  const [value, setValue] = useState({
    ...settings,
    display_name: displayName,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const { setTheme } = useTheme();
  const [spec, setSpec] = useState({
    symbol: "",
    name: "",
    tick_size: "",
    point_value: "",
  });
  const [confirmation, setConfirmation] = useState("");
  const router = useRouter();
  function result(r: { error?: string; success?: boolean }, success: string) {
    setError(r.error || "");
    setMessage(r.error ? "" : success);
    if (!r.error) router.refresh();
  }
  return (
    <>
      <div className="mb-8">
        <p className="eyebrow mb-3">MAKE THIS SPACE YOURS</p>
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Your profile, preferences, and journal data.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_310px]">
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setMessage("");
              startTransition(async () => {
                const r = await saveSettings(value);
                result(r, "Preferences saved.");
                if (!r.error) setTheme(value.theme);
              });
            }}
            className="space-y-6"
          >
            <Card>
              <CardTitle>Profile & preferences</CardTitle>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label>
                  Display name
                  <input
                    maxLength={100}
                    value={value.display_name}
                    onChange={(e) =>
                      setValue({ ...value, display_name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Storage mode
                  <input
                    value="Local · no account required"
                    readOnly
                    className="text-muted-foreground"
                  />
                </label>
                <label>
                  Trading timezone
                  <input
                    list="timezones"
                    value={value.timezone}
                    onChange={(e) =>
                      setValue({ ...value, timezone: e.target.value })
                    }
                  />
                  <datalist id="timezones">
                    {[
                      "America/Toronto",
                      "America/New_York",
                      "America/Chicago",
                      "America/Los_Angeles",
                      "Europe/London",
                      "Europe/Paris",
                      "Asia/Dubai",
                      "Asia/Tokyo",
                      "Australia/Sydney",
                      "UTC",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </datalist>
                </label>
                <label>
                  Currency display
                  <select
                    value={value.currency}
                    onChange={(e) =>
                      setValue({ ...value, currency: e.target.value })
                    }
                  >
                    {["USD", "CAD", "EUR", "GBP", "JPY", "AUD"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Appearance
                  <select
                    value={value.theme}
                    onChange={(e) =>
                      setValue({
                        ...value,
                        theme: e.target.value as Settings["theme"],
                      })
                    }
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">Match system</option>
                  </select>
                </label>
                <label>
                  Maximum screenshot size (MB)
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={value.screenshot_limit_mb}
                    onChange={(e) =>
                      setValue({
                        ...value,
                        screenshot_limit_mb: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="mt-5 text-[11px] leading-6 text-muted-foreground">
                Currency selection changes display formatting only. Standard
                contract P&L is calculated in USD; no currency conversion is
                performed.
              </p>
              <Button disabled={pending} className="mt-5">
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save preferences
              </Button>
            </Card>
          </form>
          <Card className="overflow-hidden p-0">
            <div className="p-5">
              <CardTitle>Futures contract specifications</CardTitle>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Standard specifications are read-only. Saved trades preserve
                their original tick and point values.
              </p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      "Instrument",
                      "Name",
                      "Tick size",
                      "Point value (USD)",
                      "Tick value (USD)",
                    ].map((v) => (
                      <th key={v}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specs.map((s) => (
                    <tr key={s.id || s.symbol}>
                      <td className="font-semibold">{s.symbol}</td>
                      <td className="text-muted-foreground">{s.name}</td>
                      <td>{s.tick_size}</td>
                      <td>{money(s.point_value)}</td>
                      <td>
                        {money(Number(s.tick_size) * Number(s.point_value))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form
              className="border-t border-border p-5"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const r = await addInstrument({
                    ...spec,
                    tick_size: Number(spec.tick_size),
                    point_value: Number(spec.point_value),
                  });
                  result(r, "Custom instrument added.");
                  if (!r.error)
                    setSpec({
                      symbol: "",
                      name: "",
                      tick_size: "",
                      point_value: "",
                    });
                });
              }}
            >
              <h3 className="mb-4 text-xs font-medium">
                Add a custom instrument
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["symbol", "name", "tick_size", "point_value"] as const).map(
                  (key) => (
                    <label key={key}>
                      {key.replaceAll("_", " ")}
                      <input
                        required
                        maxLength={key === "symbol" ? 16 : 100}
                        type={
                          ["tick_size", "point_value"].includes(key)
                            ? "number"
                            : "text"
                        }
                        step="any"
                        value={spec[key]}
                        onChange={(e) =>
                          setSpec({ ...spec, [key]: e.target.value })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                className="mt-4"
              >
                <Plus className="size-3" />
                Add instrument
              </Button>
            </form>
          </Card>
          <Card>
            <CardTitle>Export your journal</CardTitle>
            <p className="my-3 text-xs leading-6 text-muted-foreground">
              Download your saved records. JSON includes trades, calculations,
              journal entries, settings, and instrument specifications.
              Screenshot metadata is included; image files remain in your local
              data folder. To back up images too, copy the complete data folder
              with the journal closed.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                ["JSON · all journal data", "json", "all"],
                ["CSV · trades", "csv", "trades"],
                ["CSV · reflections", "csv", "journal"],
              ].map(([label, format, kind]) => (
                <Button key={kind} variant="outline" size="sm" asChild>
                  <a href={`/api/export?format=${format}&kind=${kind}`}>
                    <Download className="size-3" />
                    {label}
                  </a>
                </Button>
              ))}
            </div>
          </Card>
          <Card className="border-loss/30">
            <CardTitle>Delete journal data</CardTitle>
            <p className="mb-5 mt-3 text-xs leading-6 text-muted-foreground">
              Permanently remove all trades, daily reflections, tags, and
              screenshots from this workspace. Your profile, preferences, and
              instrument specifications remain. Export a copy first if you want
              to keep your records.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !confirm(
                    "Permanently delete all journal records and screenshots? This cannot be undone.",
                  )
                )
                  return;
                startTransition(async () => {
                  const r = await deleteAllJournalData(confirmation);
                  result(r, "Journal data deleted.");
                  if (!r.error) setConfirmation("");
                });
              }}
            >
              <label className="max-w-sm">
                Type DELETE MY JOURNAL to confirm
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                disabled={pending || confirmation !== "DELETE MY JOURNAL"}
              >
                Permanently delete journal data
              </Button>
            </form>
          </Card>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-6">
          <Card>
            <ShieldCheck className="mb-4 size-6 text-primary" />
            <CardTitle>Your journal. Your space.</CardTitle>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Trades, reflections, preferences, and screenshots are saved on
              this computer. No account or internet connection is needed after
              installation.
            </p>
            <p className="mt-5 text-xs font-medium">Data folder</p>
            <p className="mt-2 break-all rounded-lg bg-background p-3 text-[11px] text-muted-foreground">
              {storagePath}
            </p>
            <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
              For a complete backup, close the journal and copy this entire
              folder to another drive. Browser cache clearing does not remove
              it.
            </p>
          </Card>
          {error && (
            <Card className="border-loss/30">
              <p role="alert" className="text-xs text-loss">
                {error}
              </p>
            </Card>
          )}
          {message && (
            <Card className="border-profit/30">
              <p role="status" className="text-xs text-profit">
                {message}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
