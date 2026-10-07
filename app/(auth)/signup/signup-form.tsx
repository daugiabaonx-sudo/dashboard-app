// app/(auth)/signup/signup-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, UserRound } from "lucide-react";
import { signUpSchema, type SignUpInput } from "@/lib/schemas/auth";
import {
  FormError,
  GlassField,
  GlassPasswordField,
  GlassSubmit,
  glassStyles as styles,
} from "../glass-field";

export function SignupForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  async function onSubmit(values: SignUpInput) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "Sign up failed");
        setSubmitting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setFormError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <GlassField
        id="fullName"
        label="Full name"
        icon={UserRound}
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormError message={formError} />
      <GlassSubmit busy={submitting} label="Create account" busyLabel="Creating…" />
      <p className={styles.footer}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
