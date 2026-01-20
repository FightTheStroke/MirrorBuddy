"use client";

import { Search, X } from "lucide-react";

interface UsersSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function UsersSearch({ value, onChange }: UsersSearchProps) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        placeholder="Cerca per email o username..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   bg-white dark:bg-slate-800 dark:border-slate-700
                   text-slate-900 dark:text-white placeholder-slate-400"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
