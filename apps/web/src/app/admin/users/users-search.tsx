"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface UsersSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function UsersSearch({ value, onChange }: UsersSearchProps) {
  const t = useTranslations("admin");
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={t("cercaPerEmailOUsername")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-3 border border-border rounded-lg min-h-11
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   bg-card dark:border-border
                   text-foreground placeholder-slate-400"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
