import * as React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
};

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
    secondary: "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
    destructive: "bg-red-600 text-white",
    outline: "border border-neutral-300 text-neutral-900 dark:border-neutral-700 dark:text-neutral-100",
  };
  return <span className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
export default Badge;
