/**
 * Rotary Phone Icons - Vintage phone with rotary dial
 * Custom icons for Conte Mascetti's call button
 * Classic Italian telephone style
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
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Handset/Cornetta - classic bone shape on top */}
      <path d="M6 4C6 3 7 2 8 2h8c1 0 2 1 2 2v1c0 1-1 2-2 2h-1v2h-6V7H8C7 7 6 6 6 5V4z" />
      {/* Earpiece left */}
      <ellipse cx="7.5" cy="3.5" rx="1" ry="1.5" fill="currentColor" />
      {/* Mouthpiece right */}
      <ellipse cx="16.5" cy="3.5" rx="1" ry="1.5" fill="currentColor" />

      {/* Phone body */}
      <rect x="4" y="9" width="16" height="13" rx="2" />

      {/* Rotary dial circle */}
      <circle cx="12" cy="15" r="4.5" />

      {/* Dial holes - the number holes */}
      <circle cx="12" cy="11.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="12.2" r="0.6" fill="currentColor" />
      <circle cx="15.8" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="14.8" cy="17" r="0.6" fill="currentColor" />
      <circle cx="12" cy="18.2" r="0.6" fill="currentColor" />
      <circle cx="9.2" cy="17" r="0.6" fill="currentColor" />
      <circle cx="8.2" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="9.5" cy="12.2" r="0.6" fill="currentColor" />

      {/* Center of dial */}
      <circle cx="12" cy="15" r="1.5" />
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
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Handset/Cornetta - classic bone shape on top */}
      <path d="M6 4C6 3 7 2 8 2h8c1 0 2 1 2 2v1c0 1-1 2-2 2h-1v2h-6V7H8C7 7 6 6 6 5V4z" />
      {/* Earpiece left */}
      <ellipse cx="7.5" cy="3.5" rx="1" ry="1.5" fill="currentColor" />
      {/* Mouthpiece right */}
      <ellipse cx="16.5" cy="3.5" rx="1" ry="1.5" fill="currentColor" />

      {/* Phone body */}
      <rect x="4" y="9" width="16" height="13" rx="2" />

      {/* Rotary dial circle */}
      <circle cx="12" cy="15" r="4.5" />

      {/* Dial holes */}
      <circle cx="12" cy="11.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="12.2" r="0.6" fill="currentColor" />
      <circle cx="15.8" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="14.8" cy="17" r="0.6" fill="currentColor" />
      <circle cx="12" cy="18.2" r="0.6" fill="currentColor" />
      <circle cx="9.2" cy="17" r="0.6" fill="currentColor" />
      <circle cx="8.2" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="9.5" cy="12.2" r="0.6" fill="currentColor" />

      {/* Center of dial */}
      <circle cx="12" cy="15" r="1.5" />

      {/* Slash through - hang up indicator */}
      <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" />
    </svg>
  );
}
