import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 top-0 z-10 inline-flex items-center justify-center rounded-lg",
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
        ),
        button_next: cn(
          "absolute right-1 top-0 z-10 inline-flex items-center justify-center rounded-lg",
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 font-medium text-[0.75rem] opacity-60",
        week: "flex w-full mt-1",
        day: cn(
          "relative p-0 text-center text-sm",
          "focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          "inline-flex items-center justify-center rounded-lg",
          "h-9 w-9 p-0 font-medium transition-all duration-150",
          "hover:bg-[var(--bg-hover)] cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none",
        ),
        selected: "!bg-[var(--brand-primary)] !text-[var(--brand-on-primary)] rounded-lg font-semibold shadow-[0_2px_8px_var(--shadow-brand)]",
        today: "font-bold text-[var(--brand-text)]",
        outside: "opacity-30",
        disabled: "opacity-25 cursor-not-allowed",
        hidden: "invisible",
        range_start: "rounded-l-lg",
        range_end: "rounded-r-lg",
        range_middle: "bg-[var(--brand-primary-light)]",
        chevron: `${defaultClassNames.chevron} fill-[var(--text-secondary)]`,
      }}
      components={{
        Chevron: ({ orientation }) => {
          return orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          )
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
