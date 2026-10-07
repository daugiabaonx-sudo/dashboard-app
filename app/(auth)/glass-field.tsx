// app/(auth)/glass-field.tsx
// Floating-label glass inputs used by the login and signup forms.
// Labels are real <label htmlFor> elements so getByLabel / screen readers work.

"use client";

import { useState, type ComponentProps, type ComponentType } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import styles from "./auth-glass.module.css";

type InputProps = Omit<ComponentProps<"input">, "className" | "placeholder">;

interface GlassFieldProps extends InputProps {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  error?: string;
}

export function GlassField({ id, label, icon: Icon, error, ...input }: GlassFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={styles.field}>
      <input
        id={id}
        className={styles.input}
        placeholder=" "
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...input}
      />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <Icon className={styles.icon} aria-hidden />
      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

type PasswordFieldProps = Omit<GlassFieldProps, "icon" | "type">;

export function GlassPasswordField({ id, label, error, ...input }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const ToggleIcon = visible ? EyeOff : Eye;
  return (
    <div className={styles.field}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={styles.input}
        placeholder=" "
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...input}
      />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <KeyRound className={styles.icon} aria-hidden />
      <button
        type="button"
        className={styles.toggle}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((v) => !v)}
      >
        <ToggleIcon size={18} aria-hidden />
      </button>
      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

export function GlassSubmit({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button type="submit" className={styles.submit} disabled={busy} aria-busy={busy}>
      {busy && <span className={styles.spinner} aria-hidden="true" />}
      {busy ? busyLabel : label}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <div className={styles.formError} role="alert" aria-live="assertive">
      {message}
    </div>
  );
}

export { styles as glassStyles };
