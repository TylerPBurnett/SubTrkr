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
const MIN_GAP_DEGREES = 0.4;
const CAP_R = STROKE_WIDTH / 2;
const OUTER_R = RADIUS + CAP_R;
const INNER_R = RADIUS - CAP_R;
const CAP_ANGLE_DEG = (CAP_R / RADIUS) * (180 / Math.PI);
const MIN_VISIBLE_SPAN_DEGREES = CAP_ANGLE_DEG * 2 + 0.45;

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
}

function ptAt(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: HALF + r * Math.sin(rad),
    y: HALF - r * Math.cos(rad),
  };
}

function tangentCapsulePath(midAngleDeg: number, spanDeg: number): string {
  const center = ptAt(midAngleDeg, RADIUS);
  const theta = (midAngleDeg * Math.PI) / 180;
  const tangentX = Math.cos(theta);
  const tangentY = Math.sin(theta);
  const normalX = Math.sin(theta);
  const normalY = -Math.cos(theta);
  const arcLength = (spanDeg * Math.PI / 180) * RADIUS;
  const bodyHalfLength = Math.max(0, (Math.max(STROKE_WIDTH, arcLength) - STROKE_WIDTH) / 2);

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

function arcPath(startDeg: number, endDeg: number): string {
  const insetStart = startDeg + CAP_ANGLE_DEG;
  const insetEnd = endDeg - CAP_ANGLE_DEG;

  if (insetEnd <= insetStart) {
    return tangentCapsulePath((startDeg + endDeg) / 2, endDeg - startDeg);
  }

  const outerStart = ptAt(insetStart, OUTER_R);
  const outerEnd = ptAt(insetEnd, OUTER_R);
  const innerStart = ptAt(insetStart, INNER_R);
  const innerEnd = ptAt(insetEnd, INNER_R);
  const insetSpan = insetEnd - insetStart;
  const largeArc = insetSpan > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `A ${CAP_R} ${CAP_R} 0 0 1 ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    `A ${CAP_R} ${CAP_R} 0 0 1 ${outerStart.x} ${outerStart.y}`,
    'Z',
  ].join(' ');
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function angleForPoint(x: number, y: number) {
  return normalizeAngle(Math.atan2(x - HALF, HALF - y) * (180 / Math.PI));
}

function distanceToRange(angle: number, start: number, end: number) {
  const normalizedAngle = normalizeAngle(angle);
  const normalizedStart = normalizeAngle(start);
  const normalizedEnd = normalizeAngle(end);

  if (normalizedStart <= normalizedEnd) {
    if (normalizedAngle < normalizedStart) return normalizedStart - normalizedAngle;
    if (normalizedAngle > normalizedEnd) return normalizedAngle - normalizedEnd;
    return 0;
  }

  if (normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd) {
    return 0;
  }

  return Math.min(
    Math.abs(normalizedAngle - normalizedStart),
    Math.abs(normalizedAngle - normalizedEnd),
  );
}

function allocateDisplaySpans(rawSpans: number[], available: number) {
  if (rawSpans.length === 0) return [];

  const minDisplaySpan = Math.min(MIN_VISIBLE_SPAN_DEGREES, available / rawSpans.length);
  const resolved = new Array<number>(rawSpans.length).fill(0);
  const remaining = new Set(rawSpans.map((_, index) => index));
  let remainingAvailable = available;

  while (remaining.size > 0) {
    const remainingIndexes = Array.from(remaining);
    const remainingRawTotal = remainingIndexes.reduce((sum, index) => sum + rawSpans[index], 0);
    let frozeAny = false;

    for (const index of remainingIndexes) {
      const proposed = remainingRawTotal === 0
        ? remainingAvailable / remainingIndexes.length
        : (rawSpans[index] / remainingRawTotal) * remainingAvailable;

      if (proposed < minDisplaySpan) {
        resolved[index] = minDisplaySpan;
        remainingAvailable -= minDisplaySpan;
        remaining.delete(index);
        frozeAny = true;
      }
    }

    if (!frozeAny) {
      for (const index of remainingIndexes) {
        resolved[index] = remainingRawTotal === 0
          ? remainingAvailable / remainingIndexes.length
          : (rawSpans[index] / remainingRawTotal) * remainingAvailable;
      }
      break;
    }
  }

  return resolved;
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
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0 || data.length === 0) return [];

    const rawSpans = data.map((item) => (item.value / total) * 360);
    const minRawSpan = Math.min(...rawSpans);
    const gapDegrees = Math.min(GAP_DEGREES, Math.max(MIN_GAP_DEGREES, minRawSpan * 0.22));
    const available = Math.max(0, 360 - data.length * gapDegrees);
    const allocatedSpans = allocateDisplaySpans(
      rawSpans.map((span) => (span / 360) * available),
      available,
    );
    const hoverPadding = Math.min(1, Math.max(0.35, gapDegrees * 0.5));

    let angle = 0;

    return data.map((item, index) => {
      const span = allocatedSpans[index];
      const start = angle;
      const end = angle + span;
      angle += span + gapDegrees;

      return {
        index,
        ...item,
        end,
        glowOpacityScale: span <= MIN_VISIBLE_SPAN_DEGREES + 0.4 ? 0.82 : 1,
        hoverPadding,
        mid: (start + end) / 2,
        path: arcPath(start, end),
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
    const radius = Math.hypot(x - HALF, y - HALF);

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

      const midpointDistance = Math.min(
        Math.abs(segment.mid - angle),
        360 - Math.abs(segment.mid - angle),
      );

      if (closest === null || midpointDistance < closest.midpointDistance) {
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

        <circle
          cx={HALF}
          cy={HALF}
          r={OUTER_R + 8}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1}
          opacity={0.35}
        />

        <circle
          cx={HALF}
          cy={HALF}
          r={INNER_R - 8}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1}
          opacity={0.2}
        />

        {segments.map((segment, index) => (
          <g key={`glow-${segment.id}-${index}`} pointerEvents="none">
            <path
              d={segment.path}
              fill={segment.color}
              filter={`url(#${ambientFilterId})`}
              opacity={hoveredIndex === index ? 0.5 * segment.glowOpacityScale : 0}
              style={{ transition: 'opacity 0.35s ease' }}
            />
            <path
              d={segment.path}
              fill={segment.color}
              filter={`url(#${tightFilterId})`}
              opacity={hoveredIndex === index ? 0.7 * segment.glowOpacityScale : 0}
              style={{ transition: 'opacity 0.35s ease' }}
            />
          </g>
        ))}

        {segments.map((segment, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <path
              key={`segment-${segment.id}-${index}`}
              d={segment.path}
              fill={segment.color}
              opacity={isHovered ? 1 : hoveredIndex !== null ? 0.2 : 0.45}
              style={{
                transition: 'opacity 0.35s ease',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </svg>

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
