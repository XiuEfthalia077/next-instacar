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
    <section id="fleet" className="py-5">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-[#ffcc00]">
              Ready for Pickup
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Our Popular <span className="text-[#ffcc00]">Rides</span>
            </h2>
          </div>

          <div className="hidden md:block">
            <Link
              href="/login"
              className="font-semibold text-[#ffcc00] no-underline transition-colors hover:text-white"
            >
              View Full Fleet <ArrowRight className="inline h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {cars.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-[#6c757d]">
              No vehicles are currently listed. Check back shortly!
            </p>
          </div>
        ) : (
          <div className="mobile-car-carousel -mx-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => {
              const photo = car.image_path
                ? car.image_path.split(",")[0].trim()
                : "";
              const image = carImageUrl(photo || "default.png");
              const brand = car.brand || "Vehicle";
              const model = car.model || "";

              return (
                <div key={car.id} className="car-item-col">
                  <article className="car-card-premium">
                    <div className="car-img-wrapper">
                      <CarImage src={image} alt={`${brand} ${model}`} />
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <h3 className="mb-0 text-lg font-bold text-white">
                            {brand} {model}
                          </h3>
                          <div className="mt-1 flex gap-2">
                            <span className="flex items-center gap-1 text-sm text-[#6c757d]">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                              2024
                            </span>
                            <span className="flex items-center gap-1 text-sm text-[#6c757d]">
                              <Fuel className="h-3.5 w-3.5" aria-hidden />
                              {car.fuel_type || "Gasoline"}
                            </span>
                          </div>
                        </div>

                        <div className="price-tag whitespace-nowrap">
                          ₱{formatPrice(car.price_24_hours)}
                          <span className="text-base font-normal text-[#6c757d]">
                            /day
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 mb-4 flex gap-3 border-t border-[#6c757d]/25 pt-3 text-sm text-white">
                        <span className="flex items-center gap-1">
                          <Gauge className="h-4 w-4" aria-hidden />
                          {car.transmission || "Automatic"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" aria-hidden />
                          {car.capacity ?? 5} seats
                        </span>
                      </div>

                      <Link
                        href={`/login?car=${car.id}`}
                        className="btn-yellow-outline mt-auto flex items-center justify-center"
                      >
                        Reserve Vehicle <ChevronRight className="ms-1 h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 text-center md:hidden">
          <span className="text-sm text-[#6c757d]">
            Swipe horizontally to see more cars
          </span>
        </div>
      </div>
    </section>
  );
}
