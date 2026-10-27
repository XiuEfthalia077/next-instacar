"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Small submit button that asks for confirmation before submitting its
 * parent form with active loading spinner and transition.
 */
export function ConfirmSubmit({
  message,
  className,
  children,
  title,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={cn(
        "cursor-pointer transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 inline-flex items-center justify-center gap-1.5",
        className,
        pending && "opacity-70 cursor-wait pointer-events-none select-none",
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : children}
    </button>
  );
}
