import { ArrowLeft, Car, Fuel, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { CarImage } from "@/components/marketing/car-image";
import { requireRole } from "@/lib/auth";
import { getCar } from "@/lib/data/cars";
import { searchParam } from "@/lib/flash";
import { carImageUrl } from "@/lib/storage";

export const instant = false;

export default async function OperatorViewCarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("operator");
  const params = await searchParams;
  const idStr = searchParam(params, "id");
  const carId = Number(idStr);

  if (!idStr || !Number.isInteger(carId) || carId <= 0) {
    redirect("/operator/dashboard");
  }

  const car = await getCar(carId);

  // Must exist and belong to the operator
  if (!car || car.user_id !== session.userId) {
    notFound();
  }

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const firstImg = car.image_path ? car.image_path.split(",")[0].trim() : "default.png";
  const imgUrl = carImageUrl(firstImg);

  return (
    <>
      <PageHeader
        title={carName}
        subtitle="Vehicle Details"
        description={`Operator fleet view for vehicle ${car.plate_number ?? ""}`}
        actions={
          <Link
            href="/operator/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        }
      />

      <div className="grid gap-5 md:grid-cols-12">
        <div className="md:col-span-5">
          <SectionCard title="Vehicle Photo" icon={Car}>
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <CarImage
                src={imgUrl}
                alt={carName}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">
                Current Status
              </span>
              <StatusBadge status={car.status} />
            </div>
          </SectionCard>
        </div>

        <div className="md:col-span-7">
          <SectionCard title="Specification & Rates" icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Plate Number
                </p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {car.plate_number ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Car Type
                </p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {car.type || "Sedan"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Transmission
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-base font-bold text-foreground">
                  <Gauge className="size-4 text-muted-foreground" />
                  {car.transmission || "Automatic"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Fuel Type
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-base font-bold text-foreground">
                  <Fuel className="size-4 text-muted-foreground" />
                  {car.fuel_type || "Gasoline"}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                Rental Rates & Operator Revenue
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">10 Hours</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    <Money value={car.price_10_hours} />
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Share: <Money value={car.operator_10_hours} />
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">12 Hours</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    <Money value={car.price_12_hours} />
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Share: <Money value={car.operator_12_hours} />
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3 bg-muted/40">
                  <p className="text-xs text-muted-foreground">24 Hours</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    <Money value={car.price_24_hours} />
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Share: <Money value={car.operator_24_hours} />
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
