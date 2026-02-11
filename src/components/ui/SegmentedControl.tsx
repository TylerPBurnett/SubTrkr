import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface SegmentedControlTab<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  tabs: SegmentedControlTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function SegmentedControl<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: SegmentedControlProps<T>) {
  const count = tabs.length;
  if (count === 0) return null;

  const activeIndex = tabs.findIndex(t => t.id === activeTab);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const previousIndexRef = useRef(safeActiveIndex);
  const [edgeCollision, setEdgeCollision] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const previousIndex = previousIndexRef.current;
    if (safeActiveIndex === previousIndex) return;

    const movedLeft = safeActiveIndex < previousIndex;
    const movedRight = safeActiveIndex > previousIndex;

    if (safeActiveIndex === 0 && movedLeft) {
      setEdgeCollision('left');
    } else if (safeActiveIndex === count - 1 && movedRight) {
      setEdgeCollision('right');
    } else {
      setEdgeCollision(null);
    }

    previousIndexRef.current = safeActiveIndex;
  }, [safeActiveIndex, count]);

  const isEdge = safeActiveIndex === 0 || safeActiveIndex === count - 1;
  const pillTransition = isEdge
    ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
    : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
  const collisionClass =
    edgeCollision === 'left'
      ? 'segmented-pill-collision-left'
      : edgeCollision === 'right'
      ? 'segmented-pill-collision-right'
      : '';

  return (
    <div
      className="relative inline-grid rounded-xl overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        backgroundColor: 'var(--segmented-bg)',
        border: '1px solid var(--segmented-border)',
        padding: '4px',
      }}
    >
      {/* Sliding Pill — transform-based for pixel-perfect positioning */}
      <div
        className="absolute rounded-lg pointer-events-none"
        style={{
          top: '4px',
          bottom: '4px',
          left: '4px',
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(${safeActiveIndex * 100}%)`,
          transition: pillTransition,
          willChange: 'transform',
        }}
      >
        <div
          className={`h-full w-full rounded-lg ${collisionClass}`}
          style={{
            background: 'var(--segmented-active-bg)',
            border: '1px solid var(--segmented-active-border)',
            boxShadow: 'var(--segmented-active-shadow)',
          }}
          onAnimationEnd={() => setEdgeCollision(null)}
        />
      </div>

      {/* Buttons */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex items-center justify-center gap-2 px-5 py-2 text-[13px] font-semibold z-10 transition-colors duration-200"
            style={{
              color: isActive ? 'var(--segmented-active-text)' : 'var(--segmented-inactive-text)',
              letterSpacing: '-0.01em',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
