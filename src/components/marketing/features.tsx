import {
  Banknote,
  Car,
  Clock,
  FileCheck,
  Headphones,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

const SERVICES = [
  {
    icon: Car,
    title: "Flexible Self-Drive Rentals",
    body: "Choose the exact duration you need with our 10-hour, 12-hour, or full 24-hour rental tiers. Perfect for daily commutes, provincial road trips, and business errands.",
    tag: "Flexible Tiers",
  },
  {
    icon: Truck,
    title: "Doorstep Vehicle Delivery",
    body: "Skip the rental counter line. We can deliver your reserved vehicle directly to your doorstep, hotel lobby, or Iloilo International Airport terminal.",
    tag: "Convenience",
  },
  {
    icon: ShieldCheck,
    title: "Pre-Inspected & Clean Fleet",
    body: "Every vehicle undergoes thorough multi-point mechanical inspections, tire and fluid checks, and complete interior sanitization before key handoff.",
    tag: "Safety First",
  },
  {
    icon: Banknote,
    title: "Honest, Transparent Pricing",
    body: "Zero hidden surcharges. Clear base rates, down payments, and damage policies are fully disclosed upfront so you know exactly what you pay.",
    tag: "No Surprises",
  },
  {
    icon: FileCheck,
    title: "Instant Digital Agreement",
    body: "Review and accept your official electronic rental agreement straight from your phone or laptop. Fast, paperless, and legally compliant.",
    tag: "100% Paperless",
  },
  {
    icon: Headphones,
    title: "Dedicated Dispatch Assistance",
    body: "Our local dispatch and support crew is ready to assist you throughout your journey. Easy rental extensions, quick turnarounds, and friendly service.",
    tag: "Local Support",
  },
];

export function Features() {
  return (
    <section id="features" className="py-12 md:py-16">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00]">
            Our Core Services &amp; Guarantees
          </span>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground md:text-5xl">
            Everything You Need for a{" "}
            <span className="text-amber-600 dark:text-[#ffcc00]">Seamless Drive</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
            Whether you need a quick compact car for city errands, a spacious MPV for the family, or a rugged SUV for adventure, InstaCar delivers.
          </p>
        </div>

        {/* 6-Card Services Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#ffcc00]/60 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00] ring-1 ring-[#ffcc00]/30 transition-transform group-hover:scale-110">
                      <Icon className="size-6 text-amber-600 dark:text-[#ffcc00]" />
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {service.tag}
                    </span>
                  </div>

                  <h3 className="mb-2 text-base font-extrabold text-foreground group-hover:text-amber-600 dark:group-hover:text-[#ffcc00] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground">
                    {service.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
