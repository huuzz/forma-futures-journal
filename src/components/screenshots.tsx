"use client";
/* eslint-disable @next/next/no-img-element -- Private signed URLs and local object previews are intentionally direct images. */
import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ImagePlus,
  Upload,
  Trash2,
  X,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  registerScreenshot,
  removeScreenshot,
  updateScreenshotCaption,
} from "@/app/(journal)/attachments";
import { uploadBatch } from "@/lib/upload";
import type { Screenshot } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
export type PendingImage = {
  id: string;
  file: File;
  preview: string;
  caption: string;
};
export async function uploadImages(
  kind: "trade" | "journal",
  recordId: string,
  images: PendingImage[],
) {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Sign in again before uploading screenshots.");
  return uploadBatch(images, async (image) => {
    const extension =
      image.file.type === "image/png"
        ? "png"
        : image.file.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${user.id}/${kind}/${recordId}/${image.id}.${extension}`;
    const { error } = await client.storage
      .from("screenshots")
      .upload(path, image.file, {
        contentType: image.file.type,
        upsert: false,
      });
    if (error) {
      const { data: existing } = await client.storage
        .from("screenshots")
        .info(path);
      if (!existing) throw error;
    }
    const result = await registerScreenshot({
      kind,
      recordId,
      path,
      caption: image.caption,
    });
    if (result.error) throw new Error(result.error);
  });
}
export function ImagePicker({
  images,
  setImages,
  limitMb = 10,
}: {
  images: PendingImage[];
  setImages: (images: PendingImage[]) => void;
  limitMb?: number;
}) {
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [replace, setReplace] = useState<string | null>(null);
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () =>
      imagesRef.current.forEach((i) => URL.revokeObjectURL(i.preview)),
    [],
  );
  async function add(files: File[]) {
    const valid: PendingImage[] = [];
    let issue = "";
    for (const file of files) {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > limitMb * 1024 * 1024
      ) {
        issue = `Use PNG, JPG, or WebP images up to ${limitMb} MB.`;
        continue;
      }
      try {
        const bitmap = await createImageBitmap(file);
        bitmap.close();
        valid.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          caption: "",
        });
      } catch {
        issue = "That file could not be read as an image.";
      }
    }
    if (replace && valid.length) {
      setImages(
        images.map((i) =>
          i.id === replace ? { ...valid[0], caption: i.caption } : i,
        ),
      );
      const old = images.find((i) => i.id === replace);
      if (old) URL.revokeObjectURL(old.preview);
    } else setImages([...images, ...valid]);
    setReplace(null);
    setError(issue);
  }
  return (
    <div
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          void add(files);
        }
      }}
    >
      <button
        type="button"
        className="flex w-full flex-col items-center rounded-xl border border-dashed border-border bg-background/50 px-5 py-8 text-center hover:border-primary/60"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void add(Array.from(e.dataTransfer.files));
        }}
      >
        <ImagePlus className="mb-3 size-7 text-muted-foreground" />
        <span className="text-xs font-medium">
          Drop screenshots here, or{" "}
          <span className="text-primary">browse files</span>
        </span>
        <span className="mt-2 text-[10px] text-muted-foreground">
          PNG, JPG, WebP · up to {limitMb} MB each · focus here and paste with
          Ctrl+V
        </span>
      </button>
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={!replace}
        onChange={(e) => {
          void add(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-loss">
          {error}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {images.map((image) => (
          <div key={image.id} className="rounded-lg border border-border p-3">
            <img
              src={image.preview}
              alt="Pending screenshot"
              className="h-32 w-full rounded object-contain"
            />
            <input
              className="mt-3"
              aria-label="Screenshot caption"
              maxLength={1000}
              placeholder="Add a caption…"
              value={image.caption}
              onChange={(e) =>
                setImages(
                  images.map((i) =>
                    i.id === image.id ? { ...i, caption: e.target.value } : i,
                  ),
                )
              }
            />
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplace(image.id);
                  input.current?.click();
                }}
              >
                <RefreshCw className="size-3" />
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  URL.revokeObjectURL(image.preview);
                  setImages(images.filter((i) => i.id !== image.id));
                }}
              >
                <Trash2 className="size-3" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function ScreenshotGallery({
  images,
  kind,
  editable = false,
  onChange,
  limitMb = 10,
}: {
  images: Screenshot[];
  kind: "trade" | "journal";
  editable?: boolean;
  onChange?: () => void;
  limitMb?: number;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<Screenshot | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    const client = createClient();
    void Promise.all(
      images.map(async (image) => {
        const { data, error } = await client.storage
          .from("screenshots")
          .createSignedUrl(image.object_path, 900);
        if (error) throw error;
        return [image.id, data?.signedUrl || ""];
      }),
    )
      .then((entries) => {
        if (active) setUrls(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) setError("Could not load screenshots. Refresh to retry.");
      });
    return () => {
      active = false;
    };
  }, [images]);
  async function run(id: string, operation: () => Promise<{ error?: string }>) {
    setBusy(id);
    setError("");
    try {
      const result = await operation();
      if (result.error) setError(result.error);
      else onChange?.();
    } catch {
      setError("The screenshot action was interrupted. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  async function replaceSaved(file: File | undefined) {
    const original = replacing;
    setReplacing(null);
    if (!file || !original) return;
    await run(original.id, async () => {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > limitMb * 1024 * 1024
      )
        return { error: `Use PNG, JPG, or WebP images up to ${limitMb} MB.` };
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const recordId = original.object_path.split("/")[2];
      const failed = await uploadImages(kind, recordId, [
        {
          id: crypto.randomUUID(),
          file,
          preview: "",
          caption: captions[original.id] ?? original.caption,
        },
      ]);
      if (failed.length)
        return {
          error:
            "Replacement did not upload. Your original screenshot remains.",
        };
      // The original is removed only after its replacement is durably registered.
      return removeScreenshot(kind, original.id);
    });
  }
  if (!images.length)
    return (
      <p className="py-4 text-xs text-muted-foreground">
        No screenshots attached.
      </p>
    );
  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-xs text-loss">
          {error}
        </p>
      )}
      <input
        ref={picker}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          void replaceSaved(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-lg border border-border"
          >
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="block w-full bg-background p-2"
                  aria-label={`View screenshot: ${image.caption || "chart"}`}
                >
                  {urls[image.id] ? (
                    <img
                      src={urls[image.id]}
                      alt={image.caption || "Trade screenshot"}
                      className="h-36 w-full object-contain"
                    />
                  ) : (
                    <span className="flex h-36 items-center justify-center">
                      <Upload className="size-5 text-muted-foreground" />
                    </span>
                  )}
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
                <Dialog.Content className="fixed inset-4 z-50 flex flex-col rounded-xl border border-border bg-card p-5 focus:outline-none">
                  <div className="mb-3 flex justify-between gap-4">
                    <Dialog.Title className="text-sm">
                      {image.caption || "Screenshot"}
                    </Dialog.Title>
                    <Dialog.Close aria-label="Close full-size screenshot">
                      <X className="size-5" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">
                    Full-size private screenshot. Link expires after 15 minutes;
                    reload to refresh.
                  </Dialog.Description>
                  {urls[image.id] && (
                    <img
                      src={urls[image.id]}
                      alt={image.caption || "Screenshot"}
                      className="min-h-0 flex-1 object-contain"
                    />
                  )}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <div className="space-y-2 p-3">
              {editable ? (
                <>
                  <input
                    aria-label="Saved screenshot caption"
                    maxLength={1000}
                    value={captions[image.id] ?? image.caption}
                    onChange={(event) =>
                      setCaptions({
                        ...captions,
                        [image.id]: event.target.value,
                      })
                    }
                  />
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        void run(image.id, () =>
                          updateScreenshotCaption(
                            kind,
                            image.id,
                            captions[image.id] ?? image.caption,
                          ),
                        )
                      }
                    >
                      <Save className="size-3" />
                      Caption
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => {
                        setReplacing(image);
                        picker.current?.click();
                      }}
                    >
                      <RefreshCw className="size-3" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Remove screenshot"
                      disabled={busy !== null}
                      onClick={() => {
                        if (confirm("Delete this screenshot?"))
                          void run(image.id, () =>
                            removeScreenshot(kind, image.id),
                          );
                      }}
                    >
                      {busy === image.id ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="truncate text-xs text-muted-foreground">
                  {image.caption || "Chart screenshot"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
