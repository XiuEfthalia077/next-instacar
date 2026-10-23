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
    <footer
      className="mt-4 border-t border-[#ffcc00]/15 bg-[#0a0a0a]"
      style={{ borderTopColor: "rgba(255, 204, 0, 0.15)" }}
    >
      <div className="mx-auto w-full max-w-[1320px] px-3 py-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-2xl font-bold">
              Insta<span className="text-[#ffcc00]">Car</span>
            </h3>
            <p className="mb-0 text-[#6c757d]">
              Simple, safe, and transparent car rentals. Browse our fleet online
              and drive away with confidence.
            </p>
          </div>
          <div className="text-[#6c757d] lg:text-right">
            <p className="mb-0 text-sm">
              &copy; {year} InstaCar Rental. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
