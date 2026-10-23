"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog (legacy "Print Invoice" button). */
export function PrintButton({ label = "Print Invoice" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 font-semibold"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
