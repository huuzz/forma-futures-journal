import Link from "next/link";
import {
  BookOpen,
  Plus,
  CalendarDays,
  ChartNoAxesCombined,
  HardDrive,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function HelpPage() {
  return (
    <>
      <p className="eyebrow mb-3">YOUR JOURNAL, MADE SIMPLE</p>
      <h1 className="page-title">Getting started</h1>
      <p className="page-description mb-8">
        Open Forma Journal from your desktop. Everything saves on this computer.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <Plus className="mb-4 size-5 text-primary" />
          <CardTitle>1. Record a trade</CardTitle>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Click <strong className="text-foreground">Add Trade</strong>. Choose
            the date, instrument, and Long or Short. Enter your entry and exit
            times, prices, contract quantity, and total fees. Add your stop and
            target if you recorded them. The summary calculates your results as
            you type.
          </p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Choose Closed for a finished trade. Choose Open if you are still in
            it. Use Save draft if you want to finish the entry later. Open
            trades and drafts do not count toward realized P&L.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/trades/new">
              Add a trade
              <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        </Card>
        <Card>
          <BookOpen className="mb-4 size-5 text-primary" />
          <CardTitle>2. Save the context</CardTitle>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Add screenshots by browsing, dropping files, or focusing the
            screenshot box and pressing Ctrl+V. Write why you entered, what
            happened, and what you learned. Record your emotions and whether you
            followed your plan.
          </p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Click Save trade or Save changes and wait for confirmation. To edit
            a record later, open Trade History and click the trade.
          </p>
          <Link
            href="/trades"
            className="mt-5 inline-block text-xs text-primary"
          >
            Open trade history →
          </Link>
        </Card>
        <Card>
          <ChartNoAxesCombined className="mb-4 size-5 text-primary" />
          <CardTitle>3. Review your results</CardTitle>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Dashboard shows your saved results. Calendar shows results by day.
            Analytics breaks them down by instrument, time, risk, and
            discipline. Use the date filter to choose the period you want to
            review.
          </p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Results start empty until you save trades. Missing information stays
            blank; you do not need to invent a stop price or other details you
            did not record.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block text-xs text-primary"
          >
            Open dashboard →
          </Link>
        </Card>
        <Card>
          <CalendarDays className="mb-4 size-5 text-primary" />
          <CardTitle>4. Write a daily reflection</CardTitle>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Open Trading Journal, choose a date, and write your plan, outlook,
            or end-of-day reflection. Click Save reflection. There is one
            reflection per date, and it appears in Calendar too.
          </p>
          <Link
            href="/journal"
            className="mt-5 inline-block text-xs text-primary"
          >
            Write a reflection →
          </Link>
        </Card>
      </div>
      <Card className="mt-6">
        <HardDrive className="mb-4 size-5 text-primary" />
        <CardTitle>Opening, closing, and backing up</CardTitle>
        <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            <strong className="text-foreground">Open:</strong> double-click the
            Forma Journal desktop icon. No terminal, account, or internet is
            needed.
          </p>
          <p>
            <strong className="text-foreground">Close:</strong> finish saving,
            then close the window. Your saved records stay on disk.
          </p>
          <p>
            <strong className="text-foreground">Back up:</strong> choose Journal
            → Open data folder in the app menu. Close Forma, then copy that
            entire folder to another drive. Settings also shows the folder
            location. CSV and JSON exports contain records; a full folder copy
            includes screenshots too.
          </p>
          <p>
            <strong className="text-foreground">Preferences:</strong> use
            Settings to change your name, timezone, appearance, and other
            options.
          </p>
        </div>
        <Link
          href="/settings"
          className="mt-5 inline-block text-xs text-primary"
        >
          Open settings →
        </Link>
      </Card>
    </>
  );
}
