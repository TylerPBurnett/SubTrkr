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
const GAP_DEGREES = 2.5;
const VIEWBOX = 200;
const HALF = VIEWBOX / 2;
const HOVER_RADIAL_PADDING = 10;
const TINY_SLICE_THRESHOLD_DEGREES = 13;
const TINY_SLICE_HOVER_PADDING = 1.8;
const BASE_HOVER_PADDING = 0.65;

const OUTER_R = RADIUS + STROKE_WIDTH / 2;
const INNER_R = RADIUS - STROKE_WIDTH / 2;
const MIN_GAP_DEGREES = 0.4;
const CAP_R = STROKE_WIDTH / 2;
const CAP_ANGLE_DEG = (CAP_R / RADIUS) * (180 / Math.PI);

/** Point on a circle at angleDeg (0° = 12 o'clock, clockwise) */
function ptAt(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: HALF + r * Math.sin(rad),
    y: HALF - r * Math.cos(rad),
  };
}

function tangentCapsulePath(midAngleDeg: number, length: number): string {
  const center = ptAt(midAngleDeg, RADIUS);
  const theta = (midAngleDeg * Math.PI) / 180;
  const tangentX = Math.cos(theta);
  const tangentY = Math.sin(theta);
  const normalX = Math.sin(theta);
  const normalY = -Math.cos(theta);
  const bodyHalfLength = Math.max(0, (length - STROKE_WIDTH) / 2);

  const startCenterX = center.x - tangentX * bodyHalfLength;
  const startCenterY = center.y - tangentY * bodyHalfLength;
  const endCenterX = center.x + tangentX * bodyHalfLength;
  const endCenterY = center.y + tangentY * bodyHalfLength;

  const startTop = {
    x: startCenterX + normalX * CAP_R,
    y: startCenterY + normalY * CAP_R,
  };
  const startBottom = {
    x: startCenterX - normalX * CAP_R,
    y: startCenterY - normalY * CAP_R,
  };
  const endTop = {
    x: endCenterX + normalX * CAP_R,
    y: endCenterY + normalY * CAP_R,
  };
  const endBottom = {
    x: endCenterX - normalX * CAP_R,
    y: endCenterY - normalY * CAP_R,
  };

  return [
    `M ${startTop.x} ${startTop.y}`,
    `L ${endTop.x} ${endTop.y}`,
    `A ${CAP_R} ${CAP_R} 0 0 1 ${endBottom.x} ${endBottom.y}`,
    `L ${startBottom.x} ${startBottom.y}`,
    `A ${CAP_R} ${CAP_R} 0 0 1 ${startTop.x} ${startTop.y}`,
    'Z',
  ].join(' ');
}

/**
 * Build a filled path for a thick arc segment with rounded ends.
 * Very small slices fall back to a tangent-aligned capsule so they keep
 * a consistent thickness without visually bleeding into neighboring gaps.
 */
function arcPath(startDeg: number, endDeg: number): string {
  const span = endDeg - startDeg;

  if (span <= TINY_SLICE_THRESHOLD_DEGREES) {
    const arcLength = (span * Math.PI / 180) * RADIUS;
    return tangentCapsulePath((startDeg + endDeg) / 2, Math.max(STROKE_WIDTH, arcLength));
  }

  const insetStart = startDeg + CAP_ANGLE_DEG;
  const insetEnd = endDeg - CAP_ANGLE_DEG;

  const oS = ptAt(insetStart, OUTER_R);
  const oE = ptAt(insetEnd, OUTER_R);
  const iS = ptAt(insetStart, INNER_R);
  const iE = ptAt(insetEnd, INNER_R);

  const insetSpan = insetEnd - insetStart;
  const lg = insetSpan > 180 ? 1 : 0;

  return [
    `M ${oS.x} ${oS.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${lg} 1 ${oE.x} ${oE.y}`,
    `A ${CAP_R} ${CAP_R} 0 0 1 ${iE.x} ${iE.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${lg} 0 ${iS.x} ${iS.y}`,
    `A ${CAP_R} ${CAP_R} 0 0 1 ${oS.x} ${oS.y}`,
    'Z',
  ].join(' ');
}

function angleForPoint(x: number, y: number) {
  return (Math.atan2(x - HALF, HALF - y) * (180 / Math.PI) + 360) % 360;
}

function distanceToRange(angle: number, start: number, end: number) {
  if (angle < start) return start - angle;
  if (angle > end) return angle - end;
  return 0;
}

interface ComputedSegment {
  index: number;
  id: string;
  name: string;
  value: number;
  color: string;
  share: number;
  glowOpacityScale: number;
  hoverPadding: number;
  end: number;
  mid: number;
  path: string;
  start: number;
  span: number;
}

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
  const ambientFilterId = `${filterIdBase}-glow-a`;
  const tightFilterId = `${filterIdBase}-glow-t`;

  const isControlled = controlledHover !== undefined;
  const hoveredIndex = isControlled ? controlledHover : internalHover;

  const segments: ComputedSegment[] = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0 || data.length === 0) return [];

    const rawSpans = data.map((item) => (item.value / total) * 360);
    const minSpan = Math.min(...rawSpans);
    const gapDegrees = Math.min(GAP_DEGREES, Math.max(MIN_GAP_DEGREES, minSpan * 0.35));
    const totalGap = data.length * gapDegrees;
    const available = 360 - totalGap;

    let angle = 0;

    return data.map((item, index) => {
      const span = (item.value / total) * available;
      const start = angle;
      const end = angle + span;
      angle += span + gapDegrees;
      const isTinySlice = span <= TINY_SLICE_THRESHOLD_DEGREES;
      const hoverPadding = isTinySlice ? TINY_SLICE_HOVER_PADDING : BASE_HOVER_PADDING;
      const glowOpacityScale = isTinySlice ? 0.72 : 1;

      return {
        index,
        ...item,
        end,
        glowOpacityScale,
        hoverPadding,
        mid: (start + end) / 2,
        path: arcPath(start, end),
        span,
        start,
      };
    });
  }, [data]);

  const updateHover = useCallback((nextIndex: number | null) => {
    if (nextIndex === hoveredIndex) return;

    if (isControlled) onHoverChange?.(nextIndex);
    else setInternalHover(nextIndex);
  }, [hoveredIndex, isControlled, onHoverChange]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * VIEWBOX;
    const y = ((event.clientY - bounds.top) / bounds.height) * VIEWBOX;
    const dx = x - HALF;
    const dy = y - HALF;
    const radius = Math.hypot(dx, dy);

    if (radius < INNER_R - HOVER_RADIAL_PADDING || radius > OUTER_R + HOVER_RADIAL_PADDING) {
      updateHover(null);
      return;
    }

    const angle = angleForPoint(x, y);
    let closest: { index: number; midpointDistance: number } | null = null;

    for (const segment of segments) {
      const paddedStart = segment.start - segment.hoverPadding;
      const paddedEnd = segment.end + segment.hoverPadding;
      const rangeDistance = distanceToRange(angle, paddedStart, paddedEnd);

      if (rangeDistance > 0) continue;

      const midpointDistance = Math.abs(segment.mid - angle);

      if (
        closest === null ||
        midpointDistance < closest.midpointDistance
      ) {
        closest = {
          index: segment.index,
          midpointDistance,
        };
      }
    }

    updateHover(closest?.index ?? null);
  }, [segments, updateHover]);

  const handlePointerLeave = useCallback(() => {
    updateHover(null);
  }, [updateHover]);

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <defs>
          <filter
            id={ambientFilterId}
            filterUnits="userSpaceOnUse"
            x={-60}
            y={-60}
            width={VIEWBOX + 120}
            height={VIEWBOX + 120}
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter
            id={tightFilterId}
            filterUnits="userSpaceOnUse"
            x={-36}
            y={-36}
            width={VIEWBOX + 72}
            height={VIEWBOX + 72}
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
          cx={HALF} cy={HALF}
          r={OUTER_R + 8}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1}
          opacity={0.35}
        />

        {/* Inner guide ring */}
        <circle
          cx={HALF} cy={HALF}
          r={INNER_R - 8}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1}
          opacity={0.2}
        />

        {/* ── Glow layers ── */}
        {segments.map((seg, i) => (
          <g key={`glow-${i}`} pointerEvents="none">
            <path
              d={seg.path}
              fill={seg.color}
              filter={`url(#${ambientFilterId})`}
              opacity={hoveredIndex === i ? 0.5 * seg.glowOpacityScale : 0}
              style={{ transition: 'opacity 0.35s ease' }}
            />
            <path
              d={seg.path}
              fill={seg.color}
              filter={`url(#${tightFilterId})`}
              opacity={hoveredIndex === i ? 0.7 * seg.glowOpacityScale : 0}
              style={{ transition: 'opacity 0.35s ease' }}
            />
          </g>
        ))}

        {/* ── Filled segment shapes ── */}
        {segments.map((seg, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <path
              key={`seg-${i}`}
              d={seg.path}
              fill={seg.color}
              opacity={isHovered ? 1 : hoveredIndex !== null ? 0.2 : 0.45}
              style={{
                transition: 'opacity 0.35s ease',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </svg>

      {/* ── Center text ── */}
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
            <div style={{
              color: 'var(--text-primary)',
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              lineHeight: 1.2,
            }}>
              {hoveredData.name}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              marginTop: '4px',
            }}>
              {formatCurrency(hoveredData.value, { display: 'summary' })} &middot;{' '}
              {Math.round(hoveredData.share * 100)}%
            </div>
          </>
        ) : (
          <>
            <div style={{
              color: 'var(--text-muted)',
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {centerLabel}
            </div>
            <div style={{
              color: 'var(--text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '20px',
              fontWeight: 700,
              marginTop: '4px',
            }}>
              {centerValue}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(GlowDonutChart);
