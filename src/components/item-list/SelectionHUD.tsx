import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ItemStatus } from '@/types';
import { buildHudActions, type HudAction, type HudActionDescriptor } from './hudActions';
import { useMenuOpenReporter } from './useMenuOpenReporter';

const NARROW_QUERY = '(max-width: 560px)';
const MAX_INLINE_WIDE = 3;

const ACTION_ICONS: Record<HudAction, typeof Pause> = {
  pause: Pause,
  resume: Play,
  cancel: XCircle,
  reactivate: RotateCcw,
  archive: Archive,
  category: Tag,
};

interface SelectionHUDProps<T extends { id: string; status: ItemStatus }> {
  items: readonly T[];
  onAction: (descriptor: HudActionDescriptor) => void;
  onDelete: () => void;
  onDismiss: () => void;
  /**
   * Fires when the overflow dropdown opens or closes. The list uses it to
   * suppress the selection shortcuts while this non-modal layer is up.
   */
  onOverflowOpenChange?: (open: boolean) => void;
}

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches);
    query.addEventListener('change', handleChange);

    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isNarrow;
}

function ActionButton({
  descriptor,
  onAction,
}: {
  descriptor: HudActionDescriptor;
  onAction: (descriptor: HudActionDescriptor) => void;
}) {
  const Icon = ACTION_ICONS[descriptor.action];

  return (
    <button
      type="button"
      onClick={() => onAction(descriptor)}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors interactive-hover-bg"
      style={{ color: 'var(--text-secondary)' }}
    >
      <Icon className="w-3.5 h-3.5" />
      {descriptor.label}
      {descriptor.showCount ? (
        <span
          className="font-mono font-bold rounded px-1.5 py-px text-[10px]"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
          }}
        >
          {descriptor.eligibleCount}
        </span>
      ) : null}
    </button>
  );
}

export function SelectionHUD<T extends { id: string; status: ItemStatus }>({
  items,
  onAction,
  onDelete,
  onDismiss,
  onOverflowOpenChange,
}: SelectionHUDProps<T>) {
  const isNarrow = useIsNarrow();
  const reportOverflowOpen = useMenuOpenReporter(onOverflowOpenChange);
  const { inline, overflow } = buildHudActions(items, isNarrow ? 0 : MAX_INLINE_WIDE);
  const selectedCount = items.length;

  return (
    <AnimatePresence>
      {selectedCount > 0 ? (
        <motion.div
          className="sticky z-30 flex justify-center pointer-events-none"
          style={{ bottom: 24 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            role="toolbar"
            aria-label={`${selectedCount} selected`}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-card) 82%, transparent)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--border-strong)',
              boxShadow:
                '0 16px 40px -8px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(255, 255, 255, 0.06)',
            }}
          >
            <span
              className="px-1.5 text-xs font-semibold whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {selectedCount} selected
            </span>

            <span
              aria-hidden
              className="w-px h-[18px] mx-0.5"
              style={{ backgroundColor: 'var(--border-strong)' }}
            />

            {inline.map((descriptor) => (
              <ActionButton
                key={descriptor.action}
                descriptor={descriptor}
                onAction={onAction}
              />
            ))}

            {overflow.length > 0 ? (
              <DropdownMenu onOpenChange={reportOverflowOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center h-7 px-2 rounded-md transition-colors interactive-hover-bg"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  side="top"
                  className="w-[190px]"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  {overflow.map((descriptor) => {
                    const Icon = ACTION_ICONS[descriptor.action];

                    return (
                      <DropdownMenuItem
                        key={descriptor.action}
                        onClick={() => onAction(descriptor)}
                        className="gap-2.5 menu-item"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Icon className="w-4 h-4" />
                        {descriptor.label}
                        {descriptor.showCount ? (
                          <span className="ml-auto text-[10px] font-mono opacity-60">
                            {descriptor.eligibleCount}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <span
              aria-hidden
              className="w-px h-[18px] mx-0.5"
              style={{ backgroundColor: 'var(--border-strong)' }}
            />

            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors interactive-hover-danger"
              aria-label={`Delete ${selectedCount} selected`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isNarrow ? null : 'Delete'}
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center h-7 px-1.5 rounded-md transition-colors interactive-hover-bg"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
