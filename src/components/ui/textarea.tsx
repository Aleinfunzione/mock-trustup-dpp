import * as React from "react";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-0
                  focus:border-neutral-400 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
