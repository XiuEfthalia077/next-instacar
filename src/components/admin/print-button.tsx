"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Legacy `.btn-print` — triggers the browser print dialog (Export PDF). */
export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      Export PDF
    </Button>
  );
}
