import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SmartDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: HTMLElement | null;
  children: ReactNode;
  offset?: number;
  minWidth?: number;
}

export function SmartDropdown({
  isOpen,
  onClose,
  trigger,
  children,
  offset = 8,
  minWidth = 192,
}: SmartDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    transformOrigin: string;
    placement: 'bottom' | 'top';
  }>({
    top: 0,
    left: 0,
    transformOrigin: 'top right',
    placement: 'bottom',
  });

  // Focus management: auto-focus first item after positioning, return focus on close
  useEffect(() => {
    if (!isOpen && trigger) {
      // Return focus to trigger when closing
      trigger.focus();
    } else if (isOpen && isPositioned && dropdownRef.current) {
      // Focus first focusable element after menu is positioned
      const focusableElements = dropdownRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen, isPositioned, trigger]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Handle Escape globally when dropdown is open
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (!dropdownRef.current) return;

      const focusableElements = dropdownRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]'
      );

      if (focusableElements.length === 0) return;

      const focusableArray = Array.from(focusableElements);
      const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement);

      // Only handle arrow keys if we're in the dropdown or if we're navigating into it
      if (currentIndex === -1 && !['ArrowDown', 'ArrowUp'].includes(e.key)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex === -1) {
            // If nothing is focused, focus first item
            focusableArray[0]?.focus();
          } else {
            const nextIndex = currentIndex < focusableArray.length - 1 ? currentIndex + 1 : 0;
            focusableArray[nextIndex]?.focus();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex === -1) {
            // If nothing is focused, focus last item
            focusableArray[focusableArray.length - 1]?.focus();
          } else {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableArray.length - 1;
            focusableArray[prevIndex]?.focus();
          }
          break;

        case 'Home':
          e.preventDefault();
          focusableArray[0]?.focus();
          break;

        case 'End':
          e.preventDefault();
          focusableArray[focusableArray.length - 1]?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Position calculation
  useEffect(() => {
    if (!isOpen || !trigger) {
      setIsPositioned(false);
      return;
    }

    const updatePosition = () => {
      if (!trigger || !dropdownRef.current) return;

      const triggerRect = trigger.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate available space above and below
      const spaceBelow = viewportHeight - triggerRect.bottom - offset;
      const spaceAbove = triggerRect.top - offset;

      // Determine if dropdown should open upward or downward
      const shouldFlipUp = spaceBelow < dropdownRect.height && spaceAbove > spaceBelow;

      let top: number;
      let transformOrigin: string;
      let placement: 'bottom' | 'top';

      if (shouldFlipUp) {
        // Position above trigger
        top = triggerRect.top - dropdownRect.height - offset;
        transformOrigin = 'bottom right';
        placement = 'top';
      } else {
        // Position below trigger
        top = triggerRect.bottom + offset;
        transformOrigin = 'top right';
        placement = 'bottom';
      }

      // Calculate left position (align to right of trigger)
      let left = triggerRect.right - dropdownRect.width;

      // Ensure dropdown doesn't go off-screen horizontally
      const rightOverflow = left + dropdownRect.width - viewportWidth;
      if (rightOverflow > 0) {
        left -= rightOverflow + 16; // Add 16px padding from edge
      }

      // Ensure dropdown doesn't go off-screen on the left
      if (left < 16) {
        left = 16; // Add 16px padding from left edge
      }

      setPosition({ top, left, transformOrigin, placement });
      setIsPositioned(true);
    };

    // Wait for next frame to ensure portal is mounted
    const rafId = requestAnimationFrame(() => {
      if (dropdownRef.current) {
        updatePosition();
      }
    });

    // Recalculate on scroll or resize
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, trigger, offset]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="dropdown fixed"
        role="menu"
        aria-orientation="vertical"
        data-placement={position.placement}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          minWidth: `${minWidth}px`,
          width: 'max-content',
          maxWidth: '320px',
          zIndex: 9999,
          transformOrigin: position.transformOrigin,
          opacity: isPositioned ? 1 : 0,
          pointerEvents: isPositioned ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
