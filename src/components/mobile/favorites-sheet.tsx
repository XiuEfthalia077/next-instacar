"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowRight, Car } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/hooks/use-favorites";

export function FavoritesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] max-h-[85vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-lg sm:mx-auto flex flex-col"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                <Heart className="size-5 fill-rose-500 text-rose-500" />
                <span>Saved Vehicles</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {favorites.length} vehicle{favorites.length === 1 ? "" : "s"} in your wishlist
              </SheetDescription>
            </div>
            {favorites.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-rose-500 gap-1 font-semibold"
                onClick={() => {
                  favorites.forEach((id) => toggleFavorite(id));
                }}
              >
                <Trash2 className="size-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <Heart className="size-8 text-rose-500/60" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Saved Vehicles Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Tap the heart icon on any vehicle card to quickly save it for later comparison and instant booking.
              </p>
              <Button
                asChild
                className="mt-6 rounded-xl bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633] min-h-[44px]"
                onClick={() => onOpenChange(false)}
              >
                <Link href="/user/cars">
                  <Car className="size-4 mr-2" />
                  Explore Vehicles
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#ffcc00]/30 bg-[#ffcc00]/10 p-3.5 text-xs text-foreground flex items-center justify-between">
                <span>You have <strong>{favorites.length}</strong> saved vehicles ready to book.</span>
                <Link
                  href="/user/cars"
                  onClick={() => onOpenChange(false)}
                  className="font-bold text-amber-600 dark:text-[#ffcc00] inline-flex items-center gap-1 hover:underline text-xs"
                >
                  View in Catalog <ArrowRight className="size-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {favorites.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        <Car className="size-6 text-foreground/60" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Vehicle #{id}</p>
                        <p className="text-[11px] text-muted-foreground">Available for immediate handoff</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633] text-xs h-9 min-h-[36px]"
                        onClick={() => onOpenChange(false)}
                      >
                        <Link href={`/user/cars?search=${id}`}>Book</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl text-muted-foreground hover:text-rose-500 min-h-[36px]"
                        onClick={() => toggleFavorite(id)}
                        aria-label="Remove from favorites"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
