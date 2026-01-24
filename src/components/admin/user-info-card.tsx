interface TierInfo {
  name: string;
}

interface UserInfoCardProps {
  username: string | null;
  email: string | null;
  tier: TierInfo;
}

export function UserInfoCard({ username, email, tier }: UserInfoCardProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
      <p className="text-sm font-medium text-slate-900 dark:text-white">
        {username || "Anonymous User"}
      </p>
      {email && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{email}</p>
      )}
      {tier && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current Tier
          </p>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {tier.name}
          </p>
        </div>
      )}
    </div>
  );
}
