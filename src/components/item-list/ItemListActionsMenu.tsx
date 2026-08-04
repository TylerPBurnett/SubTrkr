import { useMemo } from 'react';
import {
  Archive,
  Calendar,
  Check,
  Clock3,
  ExternalLink,
  History,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ItemWithCategory, StatusChangeData } from '@/types';
import { isActionEligible } from './statusActions';

interface ItemListActionsMenuProps {
  item: ItemWithCategory;
  onDeleteClick: (item: ItemWithCategory) => void;
  onEdit: (item: ItemWithCategory) => void;
  onToggleActive: (id: string) => void;
  onStatusChange?: (itemId: string, action: StatusChangeData['action']) => void;
  onViewHistory?: (item: ItemWithCategory) => void;
}

function ShortcutHint({ keys }: { keys: string }) {
  return (
    <span
      className="ml-auto text-[10px] font-mono opacity-50"
      style={{ color: 'var(--text-muted)' }}
    >
      {keys}
    </span>
  );
}

export function ItemListActionsMenu({
  item,
  onDeleteClick,
  onEdit,
  onToggleActive,
  onStatusChange,
  onViewHistory,
}: ItemListActionsMenuProps) {
  const modKey = useMemo(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return isMac ? '⌘' : 'Ctrl+';
  }, []);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(event) => event.stopPropagation()}
            className="p-2 rounded-lg transition-colors interactive-hover-bg !shadow-none outline-none"
            style={{ color: 'var(--text-muted)', boxShadow: 'none' }}
            aria-label="Actions"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[200px]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            boxShadow:
              '0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--border-strong)',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={() => onEdit(item)}
            className="gap-2.5 menu-item"
            style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
          >
            <Pencil className="w-4 h-4" />
            Edit
            <ShortcutHint keys={`${modKey}E`} />
          </DropdownMenuItem>

          {isActionEligible(item.status, 'convert') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'convert')}
              className="gap-2.5 menu-item-success"
              style={{ letterSpacing: '-0.005em' }}
            >
              <Check className="w-4 h-4" />
              Convert to Paid
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'pause') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'pause')}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <Pause className="w-4 h-4" />
              Pause
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'resume') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'resume')}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <Play className="w-4 h-4" />
              Resume
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'edit_cancellation') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'edit_cancellation')}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <Calendar className="w-4 h-4" />
              Edit Cancel Date
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'cancel') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'cancel')}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <XCircle className="w-4 h-4" />
              {item.status === 'trial' ? 'Cancel Trial' : 'Cancel'}
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'reactivate') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'reactivate')}
              className="gap-2.5 menu-item-success"
              style={{ letterSpacing: '-0.005em' }}
            >
              <RotateCcw className="w-4 h-4" />
              Reactivate
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'archive') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'archive')}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <Archive className="w-4 h-4" />
              Archive
            </DropdownMenuItem>
          )}

          {isActionEligible(item.status, 'start_trial') && onStatusChange && (
            <DropdownMenuItem
              onClick={() => onStatusChange(item.id, 'start_trial')}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <Clock3 className="w-4 h-4" />
              Start Trial
            </DropdownMenuItem>
          )}

          {!onStatusChange && (
            <DropdownMenuItem
              onClick={() => onToggleActive(item.id)}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              {item.is_active ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              )}
            </DropdownMenuItem>
          )}

          {item.url && (
            <DropdownMenuItem
              asChild
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            </DropdownMenuItem>
          )}

          {onViewHistory && (
            <DropdownMenuItem
              onClick={() => onViewHistory(item)}
              className="gap-2.5 menu-item"
              style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
            >
              <History className="w-4 h-4" />
              View History
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator style={{ background: 'var(--border-default)' }} />

          <DropdownMenuItem
            onClick={() => onDeleteClick(item)}
            className="gap-2.5 menu-item-danger"
            style={{ letterSpacing: '-0.005em' }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
            <ShortcutHint keys={`${modKey}⌫`} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
