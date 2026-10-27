"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loadingText?: string;
  loading?: boolean;
}

/**
 * Modern loading button that integrates with React DOM's useFormStatus
 * or explicit `loading` prop, displaying an animated spinner and preventing double-submits.
 */
export function LoadingButton({
  children,
  loadingText,
  loading: explicitLoading,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = explicitLoading ?? pending;

  return (
    <Button
      disabled={disabled || isLoading}
      className={cn(
        "cursor-pointer transition-all duration-200 ease-in-out active:scale-[0.98]",
        isLoading && "opacity-80 cursor-wait pointer-events-none select-none",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
