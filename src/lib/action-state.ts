/**
 * Shared shape returned by every server action so the client forms can use
 * `useActionState` consistently.
 */
export type ActionState = {
  error?: string;
  success?: string;
  /** Values that should be echoed back into the form after a failure. */
  values?: Record<string, string>;
};

export const IDLE_STATE: ActionState = {};
