import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getLogoUrl } from '@/config/logoApi';

interface ChannelLogoProps {
  domain: string;
  icon: LucideIcon;
  color: string;
  size?: number;
}

export function ChannelLogo({
  domain,
  icon: Icon,
  color,
  size = 36,
}: ChannelLogoProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: `${color}20`, color }}
      >
        <Icon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={getLogoUrl(domain, size * 2)}
      alt=""
      className="rounded-lg object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
