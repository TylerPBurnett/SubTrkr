import { useState } from 'react';
import { CreditCard, Receipt, Wifi, Zap, type LucideIcon } from 'lucide-react';
import type { ItemType } from '../../types';

interface ServiceLogoProps {
  logoUrl: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  itemType?: ItemType;
  categoryName?: string;
  categoryColor?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 56,
};

const iconSizeMap = {
  sm: 16,
  md: 20,
  lg: 28,
};

function getColorFromName(name: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#ec4899', // pink
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function getFallbackIcon(itemType?: ItemType, categoryName?: string): LucideIcon {
  // Check category name for specific icons
  if (categoryName) {
    const lowerCategory = categoryName.toLowerCase();

    // Utilities - Zap icon
    if (lowerCategory.includes('utilit') || lowerCategory.includes('electric') || lowerCategory.includes('power') || lowerCategory.includes('energy')) {
      return Zap;
    }

    // Internet/Phone - Wifi icon
    if (lowerCategory.includes('internet') || lowerCategory.includes('phone') || lowerCategory.includes('mobile') || lowerCategory.includes('wireless') || lowerCategory.includes('broadband')) {
      return Wifi;
    }
  }

  // Default based on item type
  if (itemType === 'bill') {
    return Receipt;
  }

  // Default for subscriptions
  return CreditCard;
}

export default function ServiceLogo({
  logoUrl,
  name,
  size = 'md',
  className = '',
  itemType,
  categoryName,
  categoryColor
}: ServiceLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!logoUrl);

  const dimensions = sizeMap[size];
  const iconSize = iconSizeMap[size];
  // Use category color if provided, otherwise fall back to name-based color
  const bgColor = categoryColor || getColorFromName(name);

  // Show icon fallback if no URL or if loading failed
  if (!logoUrl || hasError) {
    const FallbackIcon = getFallbackIcon(itemType, categoryName);

    return (
      <div
        className={`flex items-center justify-center rounded-lg text-white flex-shrink-0 ${className}`}
        style={{
          width: dimensions,
          height: dimensions,
          backgroundColor: bgColor,
        }}
      >
        <FallbackIcon size={iconSize} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: dimensions, height: dimensions }}
    >
      {isLoading && (
        <div
          className="absolute inset-0 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--bg-input)' }}
        />
      )}
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="rounded-lg object-contain"
        style={{
          width: dimensions,
          height: dimensions,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}
