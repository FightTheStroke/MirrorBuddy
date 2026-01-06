import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'amber' | 'orange' | 'blue' | 'purple' | 'green';
}

export function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colorClasses = {
    amber: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    orange: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    blue: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    purple: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    green: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
  };

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

