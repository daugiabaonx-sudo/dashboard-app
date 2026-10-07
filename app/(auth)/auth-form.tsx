// app/(auth)/auth-form.tsx
// Shared glassmorphism chrome for login/signup: animated gradient scene,
// floating glass squares, frosted card with eyebrow + H1.

import type { CSSProperties, ReactNode } from "react";
import { El_Messiri } from "next/font/google";
import styles from "./auth-glass.module.css";

const elMessiri = El_Messiri({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const SQUARES = [0, 1, 2, 3, 4, 5] as const;

export function AuthCard({ eyebrow, title, subtitle, children }: Props) {
  return (
    <main className={`${styles.scene} ${elMessiri.className}`}>
      <div className={styles.stage}>
        {SQUARES.map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className={styles.square}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
        <section className={styles.card} aria-labelledby="auth-title">
          <div className={styles.inner}>
            <header className={styles.header}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 id="auth-title" className={styles.title}>
                {title}
              </h1>
              <p className={styles.subtitle}>{subtitle}</p>
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
