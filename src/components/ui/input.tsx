import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "h-11 w-full rounded-lg border-2 bg-transparent px-3 py-2 text-sm",
        "font-mono font-medium",
        // Placeholder
        "placeholder:text-muted-foreground",
        // Border & hover
        "border-input hover:border-border",
        // Focus - subtle border change and remove global focus ring
        "focus:border-border/80 focus:outline-none focus-visible:outline-none",
        "focus-visible:shadow-none focus-visible:ring-0 focus-visible:!box-shadow-none",
        // Dark mode
        "dark:bg-input/30",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
