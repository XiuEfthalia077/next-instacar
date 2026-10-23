/**
 * Auth layout — the standalone dark surface used by the login, register,
 * forgot-password and reset-password pages.
 *
 * The legacy pages rendered a full `<html>` document; here they share the
 * application root layout, so this group only groups the routes.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
