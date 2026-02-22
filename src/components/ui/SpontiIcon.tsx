/**
 * SpontiIcon — the official Sponti Coupon stopwatch logo mark.
 * Drop-in replacement for Zap icon wherever Sponti branding appears.
 * Renders inline SVG so it inherits `currentColor` and sizes like any icon.
 */

interface SpontiIconProps {
  className?: string;
  /** Override the fill color; defaults to currentColor so it follows text color */
  color?: string;
}

export function SpontiIcon({ className = 'w-4 h-4', color = 'currentColor' }: SpontiIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 192 192"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Stopwatch body */}
      <circle cx="96" cy="108" r="56" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray="310 42" />
      {/* Stopwatch button top */}
      <rect x="88" y="38" width="16" height="20" rx="3" fill={color} />
      {/* Speed lines */}
      <line x1="38" y1="72" x2="62" y2="80" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <line x1="32" y1="88" x2="58" y2="92" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <line x1="38" y1="104" x2="60" y2="104" stroke={color} strokeWidth="6" strokeLinecap="round" />
      {/* Clock hand */}
      <line x1="96" y1="108" x2="120" y2="86" stroke={color} strokeWidth="8" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="96" cy="108" r="6" fill={color} />
    </svg>
  );
}
