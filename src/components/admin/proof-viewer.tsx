"use client";

import { useState } from "react";
import { ExternalLink, FileText, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Proof-of-payment thumbnails + viewer.
 *
 * The legacy remittance pages showed a small thumbnail row inside the payment
 * history modal and opened images in a Bootstrap modal, while PDFs were shown
 * as a red file icon with an "Open in new tab" link. The same behaviour is
 * kept here; the URLs are signed server-side because the bucket is private.
 */

export type ProofItem = {
  id: number;
  /** Stored file name (used as the viewer label). */
  name: string;
  /** Signed URL generated on the server. Empty when signing failed. */
  url: string;
  isPdf: boolean;
};

export function ProofThumbnails({
  proofs,
  className,
}: {
  proofs: ProofItem[];
  className?: string;
}) {
  const [selected, setSelected] = useState<ProofItem | null>(null);

  if (!proofs.length) return null;

  return (
    <>
      <div className={cn("flex flex-wrap gap-2 pt-2", className)}>
        {proofs.map((proof) => {
          if (!proof.url) {
            return (
              <span
                key={proof.id}
                title={`${proof.name} (unavailable)`}
                className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
              >
                <ImageOff className="size-4" />
              </span>
            );
          }

          return (
            <button
              key={proof.id}
              type="button"
              title={proof.isPdf ? "PDF" : "View proof"}
              onClick={() => setSelected(proof)}
              className="flex size-12 overflow-hidden rounded-lg border border-border bg-muted transition hover:border-[#ffd700] hover:ring-2 hover:ring-[#ffd700]/30"
            >
              {proof.isPdf ? (
                <span className="flex size-full items-center justify-center">
                  <FileText className="size-5 text-rose-600" />
                </span>
              ) : (
                // Signed URLs cannot go through next/image's remote loader.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proof.url}
                  alt={proof.name}
                  className="size-full object-cover"
                />
              )}
            </button>
          );
        })}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Proof of Payment</DialogTitle>
            <DialogDescription className="truncate">
              {selected?.name ?? "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-muted/40 p-3 text-center">
            {selected?.isPdf ? (
              <div className="py-6">
                <FileText className="mx-auto size-16 text-rose-600" />
                <p className="mt-3 text-sm text-muted-foreground">
                  PDF file — click &ldquo;Open in new tab&rdquo; to view.
                </p>
              </div>
            ) : selected ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.url}
                alt="Proof of payment"
                className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain"
              />
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            {selected ? (
              <Button asChild variant="outline" className="rounded-lg font-semibold">
                <a href={selected.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open in new tab
                </a>
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg font-semibold">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
