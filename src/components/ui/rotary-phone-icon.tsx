/**
 * Vintage Phone Icons - Classic handset
 * Custom icons for Conte Mascetti's call button
 * Simple, bold design visible at small sizes
 */
import { type SVGProps } from 'react';

interface RotaryPhoneIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function RotaryPhoneIcon({
  size = 24,
  className,
  ...props
}: RotaryPhoneIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Classic vintage handset - chunky retro style */}
      {/* Earpiece - big round end */}
      <circle cx="5" cy="5" r="3" fill="currentColor" />
      {/* Mouthpiece - big round end */}
      <circle cx="19" cy="19" r="3" fill="currentColor" />
      {/* Handle connecting them - curved thick bar */}
      <path
        d="M7 7 C 10 4, 14 4, 17 7 L 17 17 C 14 20, 10 20, 7 17 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function RotaryPhoneOffIcon({
  size = 24,
  className,
  ...props
}: RotaryPhoneIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Classic vintage handset - chunky retro style */}
      {/* Earpiece */}
      <circle cx="5" cy="5" r="3" fill="currentColor" />
      {/* Mouthpiece */}
      <circle cx="19" cy="19" r="3" fill="currentColor" />
      {/* Handle */}
      <path
        d="M7 7 C 10 4, 14 4, 17 7 L 17 17 C 14 20, 10 20, 7 17 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Slash through */}
      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
