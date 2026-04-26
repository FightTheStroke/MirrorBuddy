"use client";

import { useTranslations } from "next-intl";
interface ConversationItemProps {
  conversation: {
    id: string;
    maestroId: string;
    title: string;
    topics: string[];
    isActive: boolean;
    messageCount: number;
    updatedAt: string;
    lastMessage?: string;
  };
  maestroName: string;
  onSelect: (id: string) => void;
  formatDate: (date: string) => string;
}

export function ConversationHistoryItem({
  conversation,
  maestroName,
  onSelect,
  formatDate,
}: ConversationItemProps) {
  const t = useTranslations("chat");
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">
              {conversation.title || 'Senza titolo'}
            </h3>
            {conversation.isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {t("attiva")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>{maestroName}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">
              {conversation.messageCount} {conversation.messageCount === 1 ? 'messaggio' : 'messaggi'}
            </span>
          </div>
          {conversation.lastMessage && (
            <p className="text-sm text-gray-500 truncate">
              {conversation.lastMessage}
            </p>
          )}
          {conversation.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {conversation.topics.slice(0, 3).map((topic, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                >
                  {topic}
                </span>
              ))}
              {conversation.topics.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{conversation.topics.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-xs text-gray-400">
          {formatDate(conversation.updatedAt)}
        </div>
      </div>
    </button>
  );
}
