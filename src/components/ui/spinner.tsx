import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    // eslint-disable-next-line local-rules/no-literal-strings-in-jsx -- ARIA label, not user-visible text
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} aria-label="Loading" />
  );
}
