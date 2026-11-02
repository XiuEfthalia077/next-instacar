"use client";

import { useMemo, useState } from "react";
import { formatPeso } from "@/lib/constants";
import { monthLabel } from "@/lib/datetime";

export interface MonthlyTelemetry {
  month: number;
  gross: number;
  expenses: number;
  net: number;
}

export function FinancialTelemetryChart({ data }: { data: MonthlyTelemetry[] }) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const { maxVal, chartData } = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const found = data.find((d) => d.month === i + 1);
      return (
        found ?? {
          month: i + 1,
          gross: 0,
          expenses: 0,
          net: 0,
        }
      );
    });

    const max = Math.max(...months.map((m) => Math.max(m.gross, m.expenses, 10_000)));
    return { maxVal: max * 1.15, chartData: months };
  }, [data]);

  const activeItem = hoveredMonth
    ? chartData.find((d) => d.month === hoveredMonth)
    : chartData[chartData.length - 1];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Annual Financial Telemetry</h3>
          <p className="text-xs text-muted-foreground">Monthly gross revenue vs operating expenses</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Gross Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-cyan-400" />
            <span className="text-muted-foreground">Net Margin</span>
          </div>
        </div>
      </div>

      {/* SVG Bar & Line Telemetry */}
      <div className="relative h-48 sm:h-56 w-full pt-4">
        <svg
          className="size-full overflow-visible"
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="40" x2="600" y2="40" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
          <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
          <line x1="0" y1="120" x2="600" y2="120" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />

          {chartData.map((d, index) => {
            const x = index * 50 + 10;
            const grossHeight = (d.gross / maxVal) * 120;
            const expHeight = (d.expenses / maxVal) * 120;
            const isHovered = hoveredMonth === d.month;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredMonth(d.month)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredMonth && !isHovered ? 0.45 : 1}
              >
                {/* Gross bar */}
                <rect
                  x={x}
                  y={130 - grossHeight}
                  width="14"
                  height={Math.max(grossHeight, 2)}
                  rx="3"
                  className="fill-emerald-500/80 transition-all hover:fill-emerald-400"
                />
                {/* Expenses bar */}
                <rect
                  x={x + 16}
                  y={130 - expHeight}
                  width="14"
                  height={Math.max(expHeight, 2)}
                  rx="3"
                  className="fill-rose-500/80 transition-all hover:fill-rose-400"
                />
                {/* Month label */}
                <text
                  x={x + 15}
                  y="150"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-bold"
                >
                  {monthLabel(d.month).slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Summary Strip */}
      {activeItem && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <div className="font-bold text-foreground">
            {monthLabel(activeItem.month)} Overview:
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">
              Revenue: <strong className="text-emerald-500">{formatPeso(activeItem.gross)}</strong>
            </span>
            <span className="text-muted-foreground">
              Expenses: <strong className="text-rose-500">{formatPeso(activeItem.expenses)}</strong>
            </span>
            <span className="text-muted-foreground">
              Net Profit:{" "}
              <strong className={activeItem.net >= 0 ? "text-cyan-400" : "text-rose-400"}>
                {formatPeso(activeItem.net)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
