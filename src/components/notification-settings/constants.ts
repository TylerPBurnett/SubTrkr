import { Hash, MessageCircle, Send, type LucideIcon } from 'lucide-react';
import type { NotificationChannelType } from '@/types';

export const CHANNEL_CONFIG: Record<
  NotificationChannelType,
  {
    label: string;
    icon: LucideIcon;
    color: string;
    description: string;
    domain: string;
  }
> = {
  telegram: {
    label: 'Telegram',
    icon: Send,
    color: '#0088cc',
    description: 'Get notified via Telegram bot',
    domain: 'telegram.org',
  },
  discord: {
    label: 'Discord',
    icon: Hash,
    color: '#5865F2',
    description: 'Send notifications to a Discord channel',
    domain: 'discord.com',
  },
  slack: {
    label: 'Slack',
    icon: MessageCircle,
    color: '#4A154B',
    description: 'Send notifications to a Slack channel',
    domain: 'slack.com',
  },
};

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];
