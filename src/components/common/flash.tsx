import { CircleCheck, Info, TriangleAlert } from "lucide-react";

import type { FlashMessages } from "@/lib/flash";
import { cn } from "@/lib/utils";

/**
 * Renders the `?success=` / `?error=` / `?warning=` banners.
 *
 * Same three tones as the legacy SweetAlert / Bootstrap alerts.
 */
export function Flash({ success, error, warning }: FlashMessages) {
  const items = [
    success
      ? {
          key: "success",
          tone: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
          icon: CircleCheck,
          text: success,
        }
      : null,
    warning
      ? {
          key: "warning",
          tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
          icon: TriangleAlert,
          text: warning,
        }
      : null,
    error
      ? {
          key: "error",
          tone: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
          icon: Info,
          text: error,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    tone: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }[];

  if (!items.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            role="status"
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium",
              item.tone,
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="whitespace-pre-line">{item.text}</p>
          </div>
        );
      })}
    </div>
  );
}
