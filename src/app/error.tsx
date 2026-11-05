"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto my-24 max-w-md p-6">
      <h1 className="page-title">Something interrupted your journal.</h1>
      <p className="page-description mb-6">
        The local journal could not be loaded. Check your data folder
        permissions and available disk space, then try again. If journal.json is
        damaged, restore a copy from your backup before making further changes.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
