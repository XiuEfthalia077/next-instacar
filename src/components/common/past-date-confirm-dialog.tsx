"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PastDateConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Past Date Confirmation",
  message = "You are selecting a date in the past. Are you sure you want to proceed with this booking?",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl border-border bg-card p-6 text-card-foreground shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <AlertTriangle className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 flex items-center justify-end gap-2.5 sm:space-x-0">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-border px-5 text-xs font-semibold"
          >
            No, Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onOpenChange(false);
              onConfirm();
            }}
            className="rounded-xl bg-[#ffcc00] px-5 text-xs font-bold text-black hover:bg-[#ffd633] transition"
          >
            Yes, Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
