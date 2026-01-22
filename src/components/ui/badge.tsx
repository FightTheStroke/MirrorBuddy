import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "outline";
}

const variantStyles = {
  default:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  secondary: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  outline:
    "border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400",
};

export function Badge({
  children,
  className,
  variant = "default",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
