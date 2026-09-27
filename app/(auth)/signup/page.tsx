// app/(auth)/signup/page.tsx
import { AuthCard } from "../auth-form";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      eyebrow="SUNEXT Operations"
      title="Create your account"
      subtitle="Set up access to your workspace."
    >
      <SignupForm />
    </AuthCard>
  );
}
