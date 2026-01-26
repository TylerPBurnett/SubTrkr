import { useState, useRef, useEffect, useCallback } from 'react';
import { searchServices, getServiceLogoUrl, type KnownService } from '../../data/knownServices';
import type { ItemType } from '../../types';
import ServiceLogo from './ServiceLogo';

interface ServiceAutocompleteProps {
  value: string;
  itemType: ItemType;
  onChange: (value: string) => void;
  onServiceSelect: (service: KnownService) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
}

export default function ServiceAutocomplete({
  value,
  itemType,
  onChange,
  onServiceSelect,
  placeholder,
  error,
  autoFocus,
}: ServiceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<KnownService[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Search when value changes
  useEffect(() => {
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
    onChange(e.target.value);
  };

  const handleSelect = (service: KnownService) => {
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
      <input
        ref={inputRef}
        type="text"
        name="name"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0 && value.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl text-base transition-all duration-200"
        style={{
          backgroundColor: 'var(--bg-input)',
          border: error ? '2px solid #ef4444' : '2px solid transparent',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />

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
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
