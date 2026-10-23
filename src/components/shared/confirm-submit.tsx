"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Small submit button that asks for confirmation before submitting its
 * parent form — the legacy inline `onsubmit="return confirm(...)"` pattern.
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
      className={cn(className, pending && "opacity-50")}
    >
      {children}
    </button>
  );
}
