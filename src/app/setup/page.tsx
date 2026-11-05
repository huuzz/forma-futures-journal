import Link from "next/link";
import {
  Database,
  ArrowUpRight,
  Check,
  LockKeyhole,
  PlugZap,
  Layers3,
} from "lucide-react";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function Setup() {
  return (
    <Shell setup>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">A MORE DELIBERATE TRADING PRACTICE</p>
          <h1 className="page-title">A fresh start. A clearer perspective.</h1>
          <p className="page-description">
            Your personal futures journal is ready to connect.
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] text-primary">
          LET’S GET YOU SET UP
        </span>
      </div>
      <Card className="relative mb-6 overflow-hidden bg-gradient-to-br from-accent/50 to-card p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <PlugZap className="mb-5 size-7 text-primary" />
          <h2 className="text-2xl font-medium tracking-tight">
            One connection.
            <br />
            Your entire trading process.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
            Connect a Supabase project to keep your trades, reflections, and
            screenshots in your own private workspace. Your journal starts
            empty, ready for your first real trade.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Open Supabase
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/preview">Preview the dashboard</Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-20 hidden size-96 rounded-full border-[45px] border-primary/5 lg:block"
        />
      </Card>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          [
            Database,
            "Your data, organized",
            "Trades, daily reflections, and preferences in PostgreSQL.",
          ],
          [
            LockKeyhole,
            "Private by design",
            "User-specific access rules and private screenshot storage.",
          ],
          [
            Layers3,
            "Built for your process",
            "Manual entries, clear calculations, and meaningful reflection.",
          ],
        ].map(([Icon, title, description]) => {
          const I = Icon as typeof Database;
          return (
            <Card key={String(title)}>
              <I className="mb-4 size-5 text-primary" />
              <h3 className="text-sm font-medium">{String(title)}</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {String(description)}
              </p>
            </Card>
          );
        })}
      </div>
      <Card>
        <h2 className="text-base font-medium">Connect your workspace</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          These steps are also included in the project’s README.
        </p>
        <ol className="mt-6 space-y-6">
          {[
            [
              "Create a Supabase project",
              "Use a new project, then open the SQL Editor. Run supabase/migrations/001_foundation.sql to create the schema and private screenshot bucket.",
            ],
            [
              "Add your public project settings",
              "Copy .env.example to .env.local. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from Project Settings → API. Never put a service-role key here.",
            ],
            [
              "Configure authentication URLs",
              "Set your Site URL and redirect URL to http://localhost:3000 and http://localhost:3000/auth/callback. Add the production equivalents when deploying.",
            ],
            [
              "Restart and create your account",
              "Restart npm run dev, then create an account and confirm your email. Your private journal will be ready.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs text-primary">
                {i + 1}
              </span>
              <div>
                <h3 className="text-xs font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-7 flex items-center gap-2 border-t border-border pt-5 text-[11px] text-muted-foreground">
          <Check className="size-3.5 text-profit" />
          No trades or screenshots are stored until your project is connected.
        </p>
      </Card>
    </Shell>
  );
}
