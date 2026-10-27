import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronRight, Fuel, Gauge, Users } from "lucide-react";

import { CarImage } from "@/components/marketing/car-image";
import type { PopularCar } from "@/lib/public-stats";
import { carImageUrl } from "@/lib/storage";

function formatPrice(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * "Our Popular Rides" — port of the `<section id="fleet">` block of
 * `car-rental/index.php`.
 *
 * The legacy markup used a Bootstrap row/column grid that turns into a
 * horizontal scroll-snap carousel below 768px (`.mobile-car-carousel`).
 */
export function FleetSection({ cars }: { cars: PopularCar[] }) {
  return (
    <section id="fleet" className="py-12 md:py-16">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00]">
              Ready for Immediate Handoff
            </span>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-foreground md:text-5xl">
              Our Featured <span className="text-amber-600 dark:text-[#ffcc00]">Vehicles</span>
            </h2>
          </div>

          <div className="hidden md:block">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-600 dark:text-[#ffcc00] dark:hover:text-[#ffd633] transition-colors"
            >
              <span>View Full Fleet (All Branches)</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {cars.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
              No vehicles are currently listed. Check back shortly or contact our dispatch team!
            </p>
          </div>
        ) : (
          <div className="mobile-car-carousel -mx-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => {
              const photo = car.image_path
                ? car.image_path.split(",")[0].trim()
                : "";
              const image = carImageUrl(photo || "default.png");
              const brand = car.brand || "Vehicle";
              const model = car.model || "";

              return (
                <div key={car.id} className="car-item-col">
                  <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#ffcc00]/60 hover:shadow-xl">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/60 flex items-center justify-center">
                      <CarImage src={image} alt={`${brand} ${model}`} />
                      <div className="absolute top-3 left-3">
                        <span className="rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
                          {car.type || "Sedan"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-extrabold text-foreground group-hover:text-amber-600 dark:group-hover:text-[#ffcc00] transition-colors">
                            {brand} {model}
                          </h3>
                          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="size-3.5" />
                              2024
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Fuel className="size-3.5" />
                              {car.fuel_type || "Gasoline"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-black text-amber-600 dark:text-[#ffcc00]">
                            ₱{formatPrice(car.price_24_hours)}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            per 24 hours
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/80 pt-2.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gauge className="size-3.5 text-foreground" />
                          {car.transmission || "Automatic"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 text-foreground" />
                          {car.capacity ?? 5} Seats
                        </span>
                      </div>

                      <Link
                        href={`/login?car=${car.id}`}
                        className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-[#ffcc00] py-2.5 text-xs font-black text-black shadow-xs transition-all hover:bg-[#ffd633] active:scale-[0.98]"
                      >
                        <span>Reserve Vehicle</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-center md:hidden">
          <span className="text-xs text-muted-foreground">
            Swipe horizontally to see more vehicles
          </span>
        </div>
      </div>
    </section>
  );
}
