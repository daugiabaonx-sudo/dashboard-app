"use client";

// Sign-out menu — extracted from <Header /> so the surface area for the
// auth-state transition is isolated and easy to test. Calls
// /api/auth/sign-out and then forces a hard navigation to /login so the
// proxy re-runs against the cleared session cookie. A soft
// router.push() would land in an inconsistent client state because the
// mock-mode proxy recreates the session cookie on the next RSC fetch
// and then redirects /login back to / when it sees the fresh cookie.

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/csrf-client";

export function SignOutMenu() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const res = await csrfFetch("/api/auth/sign-out", { method: "POST" });
      if (!res.ok) {
        toast.error("Sign out failed");
        setSigningOut(false);
        return;
      }
      toast.success("Signed out");
      // Hard navigation: see file header — soft router.push races with the
      // mock-mode proxy that re-mints the session cookie on the next RSC.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      toast.error("Network error");
      setSigningOut(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Sign out"
      onClick={handleSignOut}
      disabled={signingOut}
    >
      <LogOut />
    </Button>
  );
}
