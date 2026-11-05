"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Plus,
  ListFilter,
  CalendarDays,
  ChartNoAxesCombined,
  BookOpen,
  Settings2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
const links = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/trades/new", "Add Trade", Plus],
  ["/trades", "Trade History", ListFilter],
  ["/calendar", "Trading Calendar", CalendarDays],
  ["/analytics", "Analytics", ChartNoAxesCombined],
  ["/journal", "Trading Journal", BookOpen],
  ["/settings", "Settings", Settings2],
] as const;
export function Shell({
  children,
  name,
  initialTheme,
}: {
  children: React.ReactNode;
  name?: string;
  initialTheme?: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  useEffect(() => {
    if (initialTheme) setTheme(initialTheme);
  }, [initialTheme, setTheme]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-primary focus:p-3"
      >
        Skip to content
      </a>
      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "hidden -translate-x-full lg:flex",
        )}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-[23px] font-semibold tracking-[-1px]"
          >
            <Activity className="size-6 text-primary" />
            forma<span className="-ml-2 text-primary">.</span>
          </Link>
          <button
            className="lg:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose className="size-5" />
          </button>
        </div>
        <div className="mx-5 mb-7 rounded-lg border border-border bg-background/40 p-3">
          <p className="flex items-center gap-2 text-xs font-medium">
            <HardDrive className="size-3 text-primary" />
            Personal workspace
          </p>
          <p className="mt-1 pl-5 text-[10px] text-muted-foreground">
            Stored on this computer
          </p>
        </div>
        <p className="eyebrow px-7 pb-3">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1 px-3">
          {links.map(([href, label, Icon]) => {
            const active =
              href === "/trades"
                ? path === "/trades" ||
                  (path.startsWith("/trades/") && path !== "/trades/new")
                : path === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-xs transition-colors",
                  active
                    ? "bg-accent font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-[17px]" />
                {label}
                {label === "Add Trade" && (
                  <span className="ml-auto text-[10px] opacity-50">＋</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-5">
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <ShieldCheck className="mb-3 size-5 text-primary" />
            <p className="text-xs font-medium">
              Progress, one trade at a time.
            </p>
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
              Your best insights begin with an honest journal.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
              {(name || "M").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {name || "My journal"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                Personal · local storage
              </p>
            </div>
            <HardDrive className="size-4 text-muted-foreground" />
          </div>
        </div>
      </aside>
      <div className="lg:pl-[232px]">
        <header className="flex h-[72px] items-center justify-between gap-3 border-b border-border bg-background px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="lg:hidden"
              onClick={() => setOpen(true)}
            >
              <PanelLeft className="size-5" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Workspace<span className="mx-3 text-border">/</span>
              <span className="text-foreground">
                {links.find(([href]) => href === path)?.[1] || "Trade details"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-profit" />
              Local journal
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="hidden size-4 dark:block" />
              <Moon className="size-4 dark:hidden" />
            </Button>
            <Button asChild size="sm">
              <Link href="/trades/new">
                Add trade
                <Plus className="size-3.5" />
              </Link>
            </Button>
          </div>
        </header>
        <main id="main" className="fade-in mx-auto max-w-[1600px] p-5 sm:p-8">
          {children}
        </main>
        <footer className="mx-5 flex justify-between border-t border-border py-5 text-[10px] text-muted-foreground sm:mx-8">
          <span>Forma Journal · stored on this computer</span>
          <span>Build your process. Understand your edge.</span>
        </footer>
      </div>
    </div>
  );
}
