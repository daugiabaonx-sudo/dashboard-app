"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type SunextLogoVariant = "dark" | "light" | "transparent";
type SunextLogoSize = "sm" | "md" | "lg";

const SIZE_PX: Record<SunextLogoSize, number> = {
  sm: 80,
  md: 120,
  lg: 160,
};

interface SunextLogoProps {
  variant?: SunextLogoVariant;
  size?: SunextLogoSize;
  className?: string;
  alt?: string;
}

/**
 * SUNEXT brand wordmark with gradient fill.
 *
 * Variant selection follows the surface background the logo is placed on:
 *   - "dark" — logo file optimized for dark backgrounds (sidebar on dark theme)
 *   - "light" — logo file optimized for light backgrounds (sidebar on light theme)
 *   - "transparent" — gradient-only logo (default when no theme is known yet)
 *
 * Uses the `mounted` guard so SSR renders a stable placeholder and the
 * client picks the variant only after hydration — prevents theme flash.
 */
export function SunextLogo({
  variant,
  size = "md",
  className,
  alt = "SUNEXT",
}: SunextLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedVariant: SunextLogoVariant =
    variant ??
    (!mounted
      ? "transparent"
      : resolvedTheme === "dark"
        ? "dark"
        : "light");

  const height = Math.round((SIZE_PX[size] * 47) / 228);

  return (
    <Image
      src={`/brand/logo-${resolvedVariant}.svg`}
      width={SIZE_PX[size]}
      height={height}
      alt={alt}
      priority
      className={cn("select-none", className)}
    />
  );
}