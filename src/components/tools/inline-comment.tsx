"use client";

/**
 * InlineComment Component - Maestro feedback on student's text
 * Part of Issue #70: Collaborative summary writing
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InlineComment as InlineCommentType } from "@/types/tools";

interface InlineCommentProps {
  comment: InlineCommentType;
  highlightedText: string;
  onResolve?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
}

export function InlineComment({
  comment,
  highlightedText,
  onResolve,
  onDelete,
}: InlineCommentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        !popoverRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <span className="relative inline">
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "cursor-pointer transition-colors rounded-sm px-0.5 -mx-0.5",
          comment.resolved
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-yellow-200 dark:bg-yellow-900/50 hover:bg-yellow-300",
        )}
      >
        {highlightedText}
        <MessageCircle
          className={cn(
            "inline-block w-3 h-3 ml-0.5 -mt-1",
            comment.resolved ? "text-green-600" : "text-yellow-700",
          )}
        />
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full mt-1 z-50 min-w-[200px] max-w-[300px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Feedback del Maestro
              </span>
            </div>
            <div className="px-3 py-3">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {comment.text}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(comment.createdAt).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {!comment.resolved && (onResolve || onDelete) && (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600 flex gap-2">
                {onResolve && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onResolve(comment.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 h-7 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Risolto
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onDelete(comment.id);
                      setIsOpen(false);
                    }}
                    className="h-7 text-xs text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
            {comment.resolved && (
              <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 flex items-center gap-1.5 text-xs text-green-600">
                <Check className="w-3 h-3" />
                Hai affrontato questo punto
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

interface TextWithCommentsProps {
  content: string;
  comments: InlineCommentType[];
  onResolveComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function TextWithComments({
  content,
  comments,
  onResolveComment,
  onDeleteComment,
}: TextWithCommentsProps) {
  if (!comments.length) return <span>{content}</span>;

  const sorted = [...comments].sort((a, b) =>
    a.resolved !== b.resolved
      ? a.resolved
        ? 1
        : -1
      : a.startOffset - b.startOffset,
  );
  const segments: { text: string; comment?: InlineCommentType }[] = [];
  let lastEnd = 0;

  for (const c of sorted) {
    if (c.startOffset >= content.length || c.endOffset > content.length)
      continue;
    if (c.startOffset > lastEnd)
      segments.push({ text: content.slice(lastEnd, c.startOffset) });
    if (c.startOffset >= lastEnd) {
      segments.push({
        text: content.slice(c.startOffset, c.endOffset),
        comment: c,
      });
      lastEnd = c.endOffset;
    }
  }
  if (lastEnd < content.length) segments.push({ text: content.slice(lastEnd) });

  return (
    <span>
      {segments.map((s, i) =>
        s.comment ? (
          <InlineComment
            key={s.comment.id}
            comment={s.comment}
            highlightedText={s.text}
            onResolve={onResolveComment}
            onDelete={onDeleteComment}
          />
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}
