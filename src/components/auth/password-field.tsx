"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password input with the legacy eye toggle
 * (`car-rental/login.php` -> `.password-container` + `.toggle-password`).
 */
export function PasswordField({
  id,
  name,
  autoComplete,
  placeholder = "••••••••",
}: {
  id: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-container">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        className="auth-form-control"
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        className="toggle-password"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="h-5 w-5" aria-hidden />
        ) : (
          <Eye className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
