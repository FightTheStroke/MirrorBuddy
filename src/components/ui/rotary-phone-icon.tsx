/**
 * Vintage Phone Icons - Real rotary phone image
 * Custom icons for Conte Mascetti's call button
 */
import Image from 'next/image';

interface RotaryPhoneIconProps {
  size?: number;
  className?: string;
}

export function RotaryPhoneIcon({
  size = 24,
  className,
}: RotaryPhoneIconProps) {
  return (
    <Image
      src="/warehouse/telefono.png"
      alt="Telefono vintage"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

export function RotaryPhoneOffIcon({
  size = 24,
  className,
}: RotaryPhoneIconProps) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Image
        src="/warehouse/telefono.png"
        alt="Riattacca"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain', opacity: 0.7 }}
      />
      {/* Red diagonal slash */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
      >
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="4"
          stroke="#dc2626"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
