/**
 * Flash messages.
 *
 * The legacy PHP app used `$_SESSION['success']` / `$_SESSION['error']` and
 * rendered them on the next page load. Server actions cannot keep session
 * state without extra storage, so the same behaviour is reproduced with the
 * `?success=` / `?error=` query parameters: the action redirects back to the
 * listing page and the page renders the banner from its `searchParams`.
 */

import { redirect } from "next/navigation";

export type FlashKind = "success" | "error" | "warning";

/** Appends the flash message to a path and redirects to it. */
export function flashRedirect(
  path: string,
  kind: FlashKind,
  message: string,
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${kind}=${encodeURIComponent(message)}`);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export type FlashMessages = {
  success?: string;
  error?: string;
  warning?: string;
};

/** Extracts the flash messages from the `searchParams` of a page. */
export function readFlash(
  searchParams:
    | Record<string, string | string[] | undefined>
    | undefined,
): FlashMessages {
  if (!searchParams) return {};
  return {
    success: first(searchParams.success),
    error: first(searchParams.error),
    warning: first(searchParams.warning),
  };
}

/** Reads a single `searchParams` value. */
export function searchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  if (!searchParams) return undefined;
  return first(searchParams[key]);
}
