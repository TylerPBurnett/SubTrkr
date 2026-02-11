/**
 * Reusable SVG <defs> for chart visual effects (glow, gradients).
 * Drop these inside any Recharts <*Chart> component.
 */

interface GlowFilterProps {
  id: string;
  color?: string;
  blur?: number;
  opacity?: number;
}

export function GlowFilter({ id, color = 'var(--brand-primary)', blur = 6, opacity = 0.6 }: GlowFilterProps) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
      <feFlood floodColor={color} floodOpacity={opacity} result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

interface GradientFillProps {
  id: string;
  startColor: string;
  endColor?: string;
  startOpacity?: number;
  endOpacity?: number;
  direction?: 'vertical' | 'horizontal';
}

export function GradientFill({
  id,
  startColor,
  endColor,
  startOpacity = 0.4,
  endOpacity = 0,
  direction = 'vertical',
}: GradientFillProps) {
  const isVertical = direction === 'vertical';
  return (
    <linearGradient
      id={id}
      x1="0"
      y1="0"
      x2={isVertical ? '0' : '1'}
      y2={isVertical ? '1' : '0'}
    >
      <stop offset="0%" stopColor={endColor ?? startColor} stopOpacity={startOpacity} />
      <stop offset="100%" stopColor={startColor} stopOpacity={endOpacity} />
    </linearGradient>
  );
}

/** Lighten a hex color by mixing with white */
export function lightenColor(hex: string, amount: number = 0.3): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
