"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  KeyRound,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type TripLifecycleTrackerProps = {
  status: string;
  className?: string;
};

const STEPS = [
  {
    key: "Pending",
    label: "Pending",
    desc: "Awaiting Verification",
    icon: Clock,
  },
  {
    key: "Confirmed",
    label: "Confirmed",
    desc: "Reservation Locked",
    icon: CheckCircle2,
  },
  {
    key: "Released",
    label: "Released",
    desc: "Trip In Progress",
    icon: KeyRound,
  },
  {
    key: "Completed",
    label: "Completed",
    desc: "Trip Returned Safely",
    icon: Flag,
  },
];

export function TripLifecycleTracker({
  status,
  className,
}: TripLifecycleTrackerProps) {
  const isCancelled = status === "Cancelled";

  // Determine current active step index (0-3)
  const currentStepIndex = React.useMemo(() => {
    switch (status) {
      case "Pending":
        return 0;
      case "Confirmed":
        return 1;
      case "Released":
        return 2;
      case "Completed":
        return 3;
      default:
        return 0;
    }
  }, [status]);

  if (isCancelled) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400",
          className,
        )}
      >
        <AlertCircle className="size-4 shrink-0 text-rose-400" />
        <p className="font-semibold">
          This booking was cancelled. Total cancellation fee applies if applicable.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full py-1", className)}>
      <div className="relative">
        {/* Connecting Progress Line */}
        <div className="absolute left-[12.5%] right-[12.5%] top-[22px] h-1 -translate-y-1/2 rounded-full bg-muted/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ffcc00] to-emerald-500 transition-all duration-500"
            style={{
              width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        <div className="relative grid grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            return (
              <div
                key={step.key}
                className="relative z-10 flex flex-col items-center text-center"
              >
                {/* Stepper Circle */}
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isDone &&
                      "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]",
                    isCurrent &&
                      "border-[#ffcc00] bg-[#ffcc00] text-black shadow-[0_0_14px_rgba(255,204,0,0.5)] ring-4 ring-[#ffcc00]/20",
                    isPending &&
                      "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-bold",
                      isCurrent && "text-amber-600 dark:text-[#ffcc00]",
                      isDone && "text-emerald-600 dark:text-emerald-400",
                      isPending && "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="hidden text-[10px] text-muted-foreground sm:block">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
