interface GhostListPreviewProps {
  variant: 'item-card' | 'item-row' | 'payment-row' | 'ranked-row' | 'cancelled-row';
  count?: number;
}

const ghostBorder = '1px dashed color-mix(in srgb, var(--border-default) 50%, transparent)';
const ghostBg = 'color-mix(in srgb, var(--bg-hover) 15%, transparent)';

function ShimmerBar({ width, height = 12 }: { width: number | string; height?: number }) {
  return (
    <div
      className="ghost-shimmer-bar"
      style={{ width, height, flexShrink: 0 }}
    />
  );
}

function ShimmerCircle({ size = 40 }: { size?: number }) {
  return (
    <div
      className="ghost-shimmer-bar"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

function ItemCardGhost() {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: ghostBg, border: ghostBorder }}
    >
      <div className="flex items-center gap-3">
        <ShimmerCircle size={40} />
        <div className="flex-1 space-y-2">
          <ShimmerBar width={100} height={12} />
          <ShimmerBar width={60} height={10} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <ShimmerBar width={80} height={14} />
        <ShimmerBar width={48} height={6} />
      </div>
    </div>
  );
}

function ItemRowGhost() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ borderBottom: ghostBorder }}
    >
      <div
        className="ghost-shimmer-bar"
        style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }}
      />
      <ShimmerCircle size={32} />
      <ShimmerBar width={120} height={12} />
      <div className="flex-1" />
      <ShimmerBar width={80} height={10} />
      <ShimmerBar width={70} height={12} />
      <ShimmerBar width={60} height={10} />
    </div>
  );
}

function PaymentRowGhost() {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{ background: ghostBg, border: ghostBorder }}
    >
      <ShimmerCircle size={40} />
      <div className="flex-1 space-y-2">
        <ShimmerBar width={100} height={12} />
        <ShimmerBar width={80} height={10} />
      </div>
      <div className="text-right space-y-2">
        <ShimmerBar width={48} height={12} />
        <ShimmerBar width={56} height={10} />
      </div>
    </div>
  );
}

function RankedRowGhost({ rank }: { rank: number }) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{ background: ghostBg, border: ghostBorder }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-hover) 30%, transparent)',
          color: 'color-mix(in srgb, var(--text-muted) 40%, transparent)',
        }}
      >
        {rank}
      </div>
      <ShimmerCircle size={40} />
      <div className="flex-1 space-y-2">
        <ShimmerBar width={100} height={12} />
        <ShimmerBar width={70} height={10} />
      </div>
      <div className="text-right space-y-2">
        <ShimmerBar width={64} height={14} />
        <ShimmerBar width={80} height={10} />
      </div>
    </div>
  );
}

function CancelledRowGhost() {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{ background: ghostBg, border: ghostBorder, opacity: 0.7 }}
    >
      <ShimmerCircle size={40} />
      <div className="flex-1 space-y-2">
        <div style={{ textDecoration: 'line-through', opacity: 0.5 }}>
          <ShimmerBar width={100} height={12} />
        </div>
        <ShimmerBar width={70} height={10} />
      </div>
      <ShimmerBar width={64} height={14} />
    </div>
  );
}

export default function GhostListPreview({ variant, count = 2 }: GhostListPreviewProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'item-card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((i) => <ItemCardGhost key={i} />)}
      </div>
    );
  }

  if (variant === 'item-row') {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: ghostBorder }}
      >
        {items.map((i) => <ItemRowGhost key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((i) => {
        switch (variant) {
          case 'payment-row':
            return <PaymentRowGhost key={i} />;
          case 'ranked-row':
            return <RankedRowGhost key={i} rank={i + 1} />;
          case 'cancelled-row':
            return <CancelledRowGhost key={i} />;
        }
      })}
    </div>
  );
}
