import type { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"

const variants: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-black/85",
  secondary: "bg-neutral-200 text-neutral-900 hover:bg-neutral-300",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const classes = [base, variants[variant], className].filter(Boolean).join(" ")
  return <button className={classes} {...props} />
}
