'use client';

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { ToolCall } from '@/types';
import { useTranslations } from "next-intl";

export function StatusBadge({ status }: { status: ToolCall['status'] }) {
  const t = useTranslations("tools");
  switch (status) {
    case 'pending':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-400">
          {t("pending")}
        </span>
      );
    case 'running':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("running")}
        </span>
      );
    case 'completed':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {t("complete")}
        </span>
      );
    case 'error':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          {t("error")}
        </span>
      );
  }
}
