import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { searchServices, getServiceLogoUrl, type KnownService } from '../../data/knownServices';
import type { ItemType } from '../../types';
import ServiceLogo from './ServiceLogo';

interface ServiceAutocompleteProps {
  id?: string;
  value: string;
  itemType: ItemType;
  onChange: (value: string) => void;
  onServiceSelect: (service: KnownService) => void;
  onClear?: () => void;
  showClear?: boolean;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  /** Marks the field required for assistive tech; the `*` is visual only. */
  required?: boolean;
}

export default function ServiceAutocomplete({
  id,
  value,
  itemType,
  onChange,
  onServiceSelect,
  onClear,
  showClear,
  placeholder,
  error,
  autoFocus,
  required,
}: ServiceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<KnownService[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);
  /**
   * True once the user has typed into the field themselves.
   *
   * A value that arrived from props is already the answer — the name of the
   * item being edited, or a service just picked from this very list. Searching
   * for it offers the selected name as a suggestion for itself, which is no
   * information at all, and the dropdown that carries it pushes the rest of
   * the form down. Worse, the effect below runs on mount, so opening the edit
   * form made a suggestion list appear on its own about 150ms later, before
   * the user touched anything.
   *
   * Suggestions are for a name being composed, so only composition arms them.
   */
  const hasUserEditedRef = useRef(false);

  // Debounced search
  const search = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const results = searchServices(query, itemType);
      setSuggestions(results);
      setIsOpen(results.length > 0 && query.length > 0);
      setHighlightedIndex(-1);
    }, 150);
  }, [itemType]);

  // Search when the user changes the value — not when it merely arrives.
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!hasUserEditedRef.current) return;
    search(value);
  }, [value, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasUserEditedRef.current = true;
    onChange(e.target.value);
  };

  const handleSelect = (service: KnownService) => {
    justSelectedRef.current = true;
    // Picking a service commits a name, so the field is back to holding an
    // answer rather than a query. Without this, clicking away and back would
    // reopen the list on the name that was just chosen from it.
    hasUserEditedRef.current = false;
    onServiceSelect(service);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatBillingCycle = (cycle: string) => {
    return cycle.charAt(0).toUpperCase() + cycle.slice(1);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          name="name"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Clicking into a field that already holds the committed name is
            // not a request for suggestions — it is usually a request to fix a
            // typo in it. Reopening the list there covers the fields below.
            if (hasUserEditedRef.current && suggestions.length > 0 && value.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-required={required || undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className="item-form-input w-full px-4 py-3.5 rounded-xl transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-default)',
            border: error ? '2px solid #ef4444' : '2px solid var(--border-default)',
            color: 'var(--text-primary)',
            paddingRight: showClear ? '44px' : '16px',
          }}
        />
        {showClear && onClear && (
          <button
            type="button"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            aria-label="Clear selection"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((service, index) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleSelect(service)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors duration-100"
              style={{
                backgroundColor: highlightedIndex === index ? 'var(--bg-hover)' : 'transparent',
              }}
            >
              <ServiceLogo
                logoUrl={getServiceLogoUrl(service)}
                name={service.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {service.name}
                </div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {formatCurrency(service.defaultPrice, service.defaultCurrency)} / {formatBillingCycle(service.defaultBillingCycle)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-2" style={{ color: '#ef4444', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>{error}</p>
      )}
    </div>
  );
}
