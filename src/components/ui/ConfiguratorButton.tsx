import type { ButtonHTMLAttributes } from "react";

type Variant = "segment" | "quiet" | "primary" | "secondary";

interface ConfiguratorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Selected state for toggle-style buttons (sets `aria-pressed`). */
  active?: boolean;
}

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] tracking-[0.02em] transition-colors duration-300 ease-(--ease-premium) select-none disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const VARIANTS: Record<Variant, { idle: string; active: string }> = {
  segment: {
    idle: "h-10 px-3.5 text-ink-soft hover:bg-white/10 hover:text-ink",
    active: "h-10 px-3.5 bg-accent/25 text-ink shadow-[inset_0_0_0_1px_var(--color-accent)]",
  },
  quiet: {
    idle: "h-10 px-3.5 text-ink-soft hover:text-ink",
    active: "h-10 px-3.5 text-ink",
  },
  primary: {
    idle: "h-12 px-7 bg-accent text-white hover:bg-accent/85",
    active: "h-12 px-7 bg-accent text-white",
  },
  secondary: {
    idle: "h-12 px-7 border border-ink/20 text-ink hover:border-ink",
    active: "h-12 px-7 border border-ink text-ink",
  },
};

export function ConfiguratorButton({
  variant = "segment",
  active,
  className = "",
  type = "button",
  ...props
}: ConfiguratorButtonProps) {
  const styles = VARIANTS[variant];
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`${BASE} ${active ? styles.active : styles.idle} ${className}`}
      {...props}
    />
  );
}
