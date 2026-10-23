import { CarFront, ShieldLock } from "lucide-react";

/**
 * Shared shell of the standalone auth pages.
 *
 * Port of the `.login-container` / `.login-box` / `.register-box` blocks of
 * `car-rental/login.php` and `car-rental/register.php`:
 * a centered dark card with the yellow car logo and the InstaCar wordmark.
 */
export function AuthFrame({
  children,
  variant = "login",
  showLogo = true,
  pageClassName = "",
}: {
  children: React.ReactNode;
  /** `forgot` swaps the logo for the shield used by the legacy page. */
  variant?: "login" | "register" | "forgot" | "reset";
  /** The legacy reset page shows the wordmark only. */
  showLogo?: boolean;
  pageClassName?: string;
}) {
  const boxClass =
    variant === "register"
      ? "auth-box auth-box-register"
      : variant === "reset"
        ? "auth-box auth-box-reset"
        : "auth-box";

  return (
    <div className={`auth-page ${pageClassName}`}>
      <div className={`${boxClass} text-center`}>
        {showLogo ? (
          <div className="auth-brand-logo">
            {variant === "forgot" ? (
              <ShieldLock className="mx-auto h-14 w-14" aria-hidden />
            ) : (
              <CarFront className="mx-auto h-14 w-14" aria-hidden />
            )}
          </div>
        ) : null}

        <h1 className="auth-brand-name">
          Insta<span className="text-yellow">Car</span>
        </h1>

        {children}
      </div>
    </div>
  );
}
