import { Banknote, FileUser, Wrench } from "lucide-react";

const FEATURES = [
  {
    icon: FileUser,
    title: "Quick Online Registration",
    body: "Create your account and upload a valid driver's ID so you're pre-verified before booking.",
  },
  {
    icon: Banknote,
    title: "Clear & Honest Pricing",
    body: "No hidden surprises. Daily rates are listed up front so you know exactly what your drive costs.",
  },
  {
    icon: Wrench,
    title: "Inspected & Safe Vehicles",
    body: "Every vehicle in our fleet is cleaned and regularly maintained to ensure a safe, smooth journey.",
  },
];

/**
 * "Why Rent With Us" — port of the `<section id="features">` block of
 * `car-rental/index.php` (three `feature-card-modern` cards).
 */
export function Features() {
  return (
    <section id="features" className="py-5">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-4">
        <div className="mb-5 text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#ffcc00]">
            Why Rent With Us
          </span>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
            What Makes InstaCar{" "}
            <span className="text-[#ffcc00]">Different</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="feature-card-modern">
                <div className="icon-circle">
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="mb-3 text-lg font-bold text-white">
                  {feature.title}
                </h3>
                <p className="mb-0 text-[#6c757d]">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
