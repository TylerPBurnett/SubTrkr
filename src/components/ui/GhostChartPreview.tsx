interface GhostChartPreviewProps {
  variant: 'area-chart' | 'bar-chart' | 'pie-chart';
}

function AreaChartGhost() {
  return (
    <div className="h-64 w-full flex items-end">
      <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ghost-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[50, 100, 150].map((y) => (
          <line
            key={y}
            x1="0" y1={y} x2="400" y2={y}
            stroke="var(--border-default)"
            strokeOpacity="0.3"
            strokeDasharray="4 4"
          />
        ))}
        {/* Area fill */}
        <path
          d="M0,180 C50,170 80,140 120,120 C160,100 200,60 240,80 C280,100 320,50 360,40 L400,30 L400,200 L0,200 Z"
          fill="url(#ghost-area-fill)"
        />
        {/* Line stroke */}
        <path
          d="M0,180 C50,170 80,140 120,120 C160,100 200,60 240,80 C280,100 320,50 360,40 L400,30"
          fill="none"
          stroke="var(--brand-primary)"
          strokeOpacity="0.15"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Dots */}
        {[
          [0, 180], [120, 120], [240, 80], [360, 40],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r="4"
            fill="var(--brand-primary)"
            fillOpacity="0.15"
          />
        ))}
      </svg>
    </div>
  );
}

function BarChartGhost() {
  const bars = [
    { width: '85%', label: 100 },
    { width: '65%', label: 76 },
    { width: '45%', label: 52 },
    { width: '30%', label: 34 },
  ];

  return (
    <div className="h-64 flex flex-col justify-center gap-4 px-2">
      {bars.map((bar, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="ghost-shimmer-bar"
            style={{ width: 80, height: 10, flexShrink: 0, animation: 'none' }}
          />
          <div className="flex-1 h-6 rounded-md overflow-hidden">
            <div
              className="h-full rounded-r-md"
              style={{
                width: bar.width,
                background: `color-mix(in srgb, var(--brand-primary) ${8 + i * 2}%, transparent)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PieChartGhost() {
  const legendItems = [
    { width: 80 },
    { width: 64 },
    { width: 72 },
  ];

  return (
    <div className="flex items-center gap-6 justify-center py-4">
      {/* Donut */}
      <div
        className="shrink-0"
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(
            color-mix(in srgb, var(--brand-primary) 16%, transparent) 0deg 120deg,
            color-mix(in srgb, var(--brand-primary) 10%, transparent) 120deg 240deg,
            color-mix(in srgb, var(--brand-primary) 6%, transparent) 240deg 360deg
          )`,
          position: 'relative',
        }}
      >
        {/* Center cutout */}
        <div
          style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            background: 'var(--bg-card)',
          }}
        />
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {legendItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                background: `color-mix(in srgb, var(--brand-primary) ${16 - i * 4}%, transparent)`,
              }}
            />
            <div
              className="ghost-shimmer-bar"
              style={{ width: item.width, height: 10, animation: 'none' }}
            />
            <div
              className="ghost-shimmer-bar"
              style={{ width: 48, height: 10, animation: 'none' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GhostChartPreview({ variant }: GhostChartPreviewProps) {
  switch (variant) {
    case 'area-chart':
      return <AreaChartGhost />;
    case 'bar-chart':
      return <BarChartGhost />;
    case 'pie-chart':
      return <PieChartGhost />;
  }
}
