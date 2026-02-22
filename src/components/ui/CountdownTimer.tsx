'use client';

import { useCountdown } from '@/lib/hooks/useCountdown';

interface CountdownTimerProps {
  expiresAt: string;
  size?: 'sm' | 'md' | 'lg';
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, size = 'md', onExpire }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, expired } = useCountdown(expiresAt);

  if (expired) {
    if (onExpire) onExpire();
    return (
      <div className="flex items-center gap-1 text-red-500 font-bold">
        <span className="text-red-500">EXPIRED</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 min-w-[40px]',
    md: 'text-sm px-3 py-2 min-w-[56px]',
    lg: 'text-lg px-4 py-3 min-w-[72px]',
  };

  const labelSize = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const isUrgent = days === 0 && hours < 2;

  return (
    <div className="flex items-center gap-1.5">
      {days > 0 && (
        <div className={`countdown-box ${sizeClasses[size]} ${isUrgent ? 'bg-red-600 animate-pulse' : ''}`}>
          <div className="font-bold tabular-nums">{String(days).padStart(2, '0')}</div>
          <div className={`${labelSize[size]} text-gray-300`}>Days</div>
        </div>
      )}
      <div className={`countdown-box ${sizeClasses[size]} ${isUrgent ? 'bg-red-600 animate-pulse' : ''}`}>
        <div className="font-bold tabular-nums">{String(hours).padStart(2, '0')}</div>
        <div className={`${labelSize[size]} text-gray-300`}>Hrs</div>
      </div>
      <span className={`${isUrgent ? 'text-red-500' : 'text-secondary-500'} font-bold`}>:</span>
      <div className={`countdown-box ${sizeClasses[size]} ${isUrgent ? 'bg-red-600 animate-pulse' : ''}`}>
        <div className="font-bold tabular-nums">{String(minutes).padStart(2, '0')}</div>
        <div className={`${labelSize[size]} text-gray-300`}>Min</div>
      </div>
      <span className={`${isUrgent ? 'text-red-500' : 'text-secondary-500'} font-bold`}>:</span>
      <div className={`countdown-box ${sizeClasses[size]} ${isUrgent ? 'bg-red-600 animate-pulse' : ''}`}>
        <div className="font-bold tabular-nums">{String(seconds).padStart(2, '0')}</div>
        <div className={`${labelSize[size]} text-gray-300`}>Sec</div>
      </div>
    </div>
  );
}
