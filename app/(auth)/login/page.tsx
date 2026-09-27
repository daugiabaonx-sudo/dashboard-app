// app/(auth)/login/page.tsx
import { Suspense } from "react";
import { AuthCard } from "../auth-form";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthCard
      eyebrow="SUNEXT Operations"
      title="Welcome back"
      subtitle="Sign in to manage projects, tasks, and your team."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
