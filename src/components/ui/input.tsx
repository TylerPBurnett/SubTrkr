import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-lg border bg-transparent px-3 py-2 text-sm",
        "font-mono font-medium",
        "placeholder:text-muted-foreground",
        "border-input hover:border-border",
        "focus:border-primary focus:outline-none focus-visible:outline-none",
        "dark:bg-input/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
