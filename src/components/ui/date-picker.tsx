import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { parseLocalDate } from "@/utils/dates"

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) */
  value: string
  onChange: (isoDate: string) => void
  /** Minimum selectable date as ISO string */
  min?: string
  error?: boolean
  placeholder?: string
  id?: string
  name?: string
  /**
   * Preferred side. Collision still flips if there is no room.
   * Use `"top"` for fields that sit at the bottom of a tall dialog.
   */
  side?: "top" | "bottom"
  /**
   * Names the field for assistive tech. The trigger is a button, so its
   * accessible name comes from its own text — which is the chosen date, or the
   * placeholder. Either way it says what the value is and never what the field
   * is, and the visible `<label>` beside it carries no `htmlFor` to close that
   * gap. Callers should pass something like "Start Date (required)":
   * `aria-required` is not valid on a button, so a required date field has to
   * say so in its name.
   */
  ariaLabel?: string
  /** Id of an error node, so the reason reaches the same announcement. */
  ariaDescribedBy?: string
}

export function DatePicker({
  value,
  onChange,
  min,
  error,
  placeholder = "Pick a date",
  id,
  name,
  side = "bottom",
  ariaLabel,
  ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(() => {
    if (!value) return undefined
    return parseLocalDate(value)
  }, [value])

  const minDate = React.useMemo(() => {
    if (!min) return undefined
    return parseLocalDate(min)
  }, [min])

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onChange(format(date, "yyyy-MM-dd"))
    setOpen(false)
  }

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          name={name}
          type="button"
          aria-label={ariaLabel}
          aria-invalid={error || undefined}
          aria-describedby={ariaDescribedBy}
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
        side={side}
        sideOffset={6}
        collisionPadding={16}
        sticky="always"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '16px',
          boxShadow: '0 16px 48px -12px rgba(0, 0, 0, 0.3)',
          // Reserve the month grid's height up front. An empty first layout
          // fits under the trigger, then the calendar mounts and overflows
          // the window — which is why Trial Ends at the bottom of ItemForm
          // could open but never be clicked at 800px tall.
          minHeight: 288,
        }}
      >
        <Calendar
          mode="single"
          required
          selected={selected}
          onSelect={handleSelect}
          disabled={minDate ? { before: minDate } : undefined}
          defaultMonth={selected || minDate || new Date()}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
