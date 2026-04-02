import { useState, useMemo, useCallback, useId, memo } from 'react';
import { formatCurrency } from '../../utils/currency';

interface DonutSegment {
  id: string;
  name: string;
  value: number;
  color: string;
  share: number;
}

interface GlowDonutChartProps {
  data: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
}

const RADIUS = 70;
const STROKE_WIDTH = 13;
const GAP_DEGREES = 4;
const VIEWBOX = 200;
const HALF = VIEWBOX / 2;

function GlowDonutChart({
  data,
  centerLabel = 'RUN RATE',
  centerValue,
  size = 160,
  hoveredIndex: controlledHover,
  onHoverChange,
}: GlowDonutChartProps) {
  const [internalHover, setInternalHover] = useState<number | null>(null);
  const filterIdBase = useId().replace(/:/g, '');
  const ambientFilterId = `${filterIdBase}-donut-glow-ambient`;
  const tightFilterId = `${filterIdBase}-donut-glow-tight`;

  const isControlled = controlledHover !== undefined;
  const hoveredIndex = isControlled ? controlledHover : internalHover;

  const circumference = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0 || data.length === 0) return [];

    const gapCount = data.length;
    const totalGapDegrees = gapCount * GAP_DEGREES;
    const availableDegrees = 360 - totalGapDegrees;

    let currentAngle = 0;

    return data.map((item) => {
      const segmentDegrees = (item.value / total) * availableDegrees;
      const arcLength = (segmentDegrees / 360) * circumference;
      const offset = (currentAngle / 360) * circumference;

      currentAngle += segmentDegrees + GAP_DEGREES;

      return {
        ...item,
        arcLength,
        dashArray: `${arcLength} ${circumference - arcLength}`,
        // Shift by circumference/4 to start at 12 o'clock instead of 3 o'clock
        dashOffset: circumference / 4 - offset,
      };
    });
  }, [data, circumference]);

  const handleMouseEnter = useCallback(
    (index: number) => {
      if (isControlled) {
        onHoverChange?.(index);
      } else {
        setInternalHover(index);
      }
    },
    [isControlled, onHoverChange],
  );

  const handleMouseLeave = useCallback(() => {
    if (isControlled) {
      onHoverChange?.(null);
    } else {
      setInternalHover(null);
    }
  }, [isControlled, onHoverChange]);

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Broad ambient glow — soft halo behind segment */}
          <filter
            id={ambientFilterId}
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>

          {/* Tight glow — bright edge around segment */}
          <filter
            id={tightFilterId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer guide ring */}
        <circle
          cx={HALF}
          cy={HALF}
          r={RADIUS + STROKE_WIDTH / 2 + 6}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={1}
          opacity={0.2}
        />

        {/* Inner guide ring */}
        <circle
          cx={HALF}
          cy={HALF}
          r={RADIUS - STROKE_WIDTH / 2 - 6}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={1}
          opacity={0.12}
        />

        {/* ── Ambient glow layers (furthest back) ── */}
        {segments.map((seg, i) => (
          <circle
            key={`ambient-${i}`}
            cx={HALF}
            cy={HALF}
            r={RADIUS}
            fill="none"
            stroke={seg.color}
            strokeWidth={STROKE_WIDTH + 6}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            filter={`url(#${ambientFilterId})`}
            opacity={hoveredIndex === i ? 0.45 : 0}
            style={{ transition: 'opacity 0.35s ease' }}
            pointerEvents="none"
          />
        ))}

        {/* ── Tight glow layers ── */}
        {segments.map((seg, i) => (
          <circle
            key={`glow-${i}`}
            cx={HALF}
            cy={HALF}
            r={RADIUS}
            fill="none"
            stroke={seg.color}
            strokeWidth={STROKE_WIDTH + 2}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            filter={`url(#${tightFilterId})`}
            opacity={hoveredIndex === i ? 0.65 : 0}
            style={{ transition: 'opacity 0.35s ease' }}
            pointerEvents="none"
          />
        ))}

        {/* ── Main visible segments ── */}
        {segments.map((seg, i) => {
          const isHovered = hoveredIndex === i;
          const isDimmed = hoveredIndex !== null && !isHovered;

          return (
            <circle
              key={`seg-${i}`}
              cx={HALF}
              cy={HALF}
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              opacity={isDimmed ? 0.2 : 1}
              style={{
                transition: 'opacity 0.35s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}

        {/* ── Invisible wider hit targets for easier hovering ── */}
        {segments.map((seg, i) => (
          <circle
            key={`hit-${i}`}
            cx={HALF}
            cy={HALF}
            r={RADIUS}
            fill="none"
            stroke="transparent"
            strokeWidth={STROKE_WIDTH + 20}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter(i)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </svg>

      {/* ── Center text overlay ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        {hoveredData ? (
          <>
            <div
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {hoveredData.name}
            </div>
            <div
              style={{
                color: 'var(--text-secondary)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                marginTop: '4px',
              }}
            >
              {formatCurrency(hoveredData.value, { display: 'summary' })} &middot;{' '}
              {Math.round(hoveredData.share * 100)}%
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {centerLabel}
            </div>
            <div
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '20px',
                fontWeight: 700,
                marginTop: '4px',
              }}
            >
              {centerValue}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(GlowDonutChart);
