// app/(auth)/login/login-form.tsx
// Client form: RHF + Zod, posts to /api/auth/sign-in (Supabase), then
// redirects to a sanitised `next`. Glass UI from "Login Dasboard".

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { signInSchema } from "@/lib/schemas/auth";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import {
  browserStore,
  persistRememberedEmail,
  readRememberedEmail,
} from "@/lib/auth/remembered-email";
import {
  FormError,
  GlassField,
  GlassPasswordField,
  GlassSubmit,
  glassStyles as styles,
} from "../glass-field";

// `remember` is UI-only and never sent to the API.
const loginFormSchema = signInSchema.extend({ remember: z.boolean() });
type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  // Restore the remembered email after mount (localStorage is client-only).
  useEffect(() => {
    const saved = readRememberedEmail(browserStore());
    if (saved) {
      setValue("email", saved);
      setValue("remember", true);
    }
  }, [setValue]);

  async function onSubmit({ email, password, remember }: LoginFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "Sign in failed");
        setSubmitting(false);
        return;
      }
      persistRememberedEmail(browserStore(), email, remember);
      router.push(nextPath);
      router.refresh();
      // Keep the spinner until navigation unmounts the form.
    } catch {
      setFormError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <GlassField
        id="email"
        label="Email"
        type="email"
        icon={Mail}
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <GlassPasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <label className={styles.remember}>
        <input type="checkbox" {...register("remember")} />
        <span>Remember me</span>
      </label>
      <FormError message={formError} />
      <GlassSubmit busy={submitting} label="Sign in" busyLabel="Signing in…" />
      <p className={styles.footer}>
        Don&apos;t have an account? <Link href="/signup">Create one</Link>
      </p>
    </form>
  );
}
