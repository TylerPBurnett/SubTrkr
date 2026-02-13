import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) */
  value: string
  onChange: (isoDate: string) => void
  /** Minimum selectable date as ISO string */
  min?: string
  error?: boolean
  placeholder?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  min,
  error,
  placeholder = "Pick a date",
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convert ISO string to Date for the calendar
  const selected = React.useMemo(() => {
    if (!value) return undefined
    return parse(value, "yyyy-MM-dd", new Date())
  }, [value])

  const minDate = React.useMemo(() => {
    if (!min) return undefined
    return parse(min, "yyyy-MM-dd", new Date())
  }, [min])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"))
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="item-form-input w-full px-4 py-3.5 rounded-xl flex items-center gap-3 text-left"
          style={{
            border: `2px solid ${error ? '#ef4444' : 'var(--border-default)'}`,
            background: 'var(--bg-default)',
            color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <CalendarIcon
            className="h-4 w-4 shrink-0"
            style={{ color: 'var(--text-muted)' }}
          />
          <span className="flex-1 truncate">
            {selected ? format(selected, "MMM d, yyyy") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '16px',
          boxShadow: '0 16px 48px -12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={minDate ? { before: minDate } : undefined}
          defaultMonth={selected || new Date()}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
