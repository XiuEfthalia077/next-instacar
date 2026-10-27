/**
 * The copyright year.
 *
 * `car-rental/index.php` printed `date('Y')` at request time. Caching it keeps
 * the landing page statically prerenderable.
 */
async function copyrightYear() {
  "use cache";
  return new Date().getFullYear();
}

/**
 * Footer — port of the `<footer>` block of `car-rental/index.php`.
 *
 * The legacy footer only carried the brand block and the copyright line.
 */
export async function SiteFooter() {
  const year = await copyrightYear();

  return (
    <footer className="mt-8 border-t border-border bg-muted/30 text-muted-foreground transition-colors">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2 items-center">
          <div>
            <h3 className="mb-2 text-2xl font-black text-foreground">
              Insta<span className="text-[#ffcc00]">Car</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
              Reliable, safe, and transparent car rentals in Pavia &amp; Western Visayas.
              Enjoy 10h, 12h &amp; 24h flexible tiers with doorstep vehicle delivery.
            </p>
          </div>
          <div className="text-xs text-muted-foreground lg:text-right">
            <p className="font-semibold text-foreground">
              Official Car Rental &amp; Logistics Service
            </p>
            <p className="mt-1">
              &copy; {year} InstaCar Rental Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
