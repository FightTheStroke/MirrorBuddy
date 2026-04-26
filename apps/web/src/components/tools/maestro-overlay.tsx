"use client";

// ============================================================================
// MAESTRO OVERLAY
// Floating overlay showing the Maestro during fullscreen tool building
// Part of Phase 4: Fullscreen Layout
// ============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Loader2,
  MessageSquare,
  X,
  Minimize2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type MaestroStatus = "idle" | "thinking" | "building" | "speaking";

export interface MaestroOverlayProps {
  maestro: {
    id: string;
    displayName: string;
    avatar: string;
    color: string;
  };
  status: MaestroStatus;
  lastMessage?: string;
  onClose?: () => void;
  onExpand?: () => void;
  className?: string;
}

export function MaestroOverlay({
  maestro,
  status,
  lastMessage,
  onClose,
  onExpand,
  className,
}: MaestroOverlayProps) {
  const t = useTranslations("tools");
  // Use lazy initializer to set initial position based on window size
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      return {
        x: window.innerWidth - 220,
        y: window.innerHeight - 280,
      };
    }
    return { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Handle dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position.x, position.y],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      // Keep within viewport
      const maxX = window.innerWidth - 200;
      const maxY = window.innerHeight - 250;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const getStatusText = () => {
    switch (status) {
      case "thinking":
        return "Sto pensando...";
      case "building":
        return "Sto costruendo...";
      case "speaking":
        return "Sto parlando...";
      default:
        return "Pronto";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "thinking":
        return "bg-amber-500";
      case "building":
        return "bg-blue-500";
      case "speaking":
        return "bg-green-500";
      default:
        return "bg-slate-400";
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        ref={overlayRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ left: position.x, top: position.y }}
        className={cn("fixed z-50 cursor-pointer", className)}
        onClick={() => setIsMinimized(false)}
      >
        <div
          className="relative w-14 h-14 rounded-full shadow-lg border-2 overflow-hidden"
          style={{ borderColor: maestro.color }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.displayName}
            fill
            className="object-cover"
          />
          {status !== "idle" && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <span
                className={cn(
                  "w-4 h-4 rounded-full animate-pulse block",
                  getStatusColor(),
                )}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        style={{ left: position.x, top: position.y }}
        className={cn(
          "fixed z-50 w-[200px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          className,
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Header with drag handle */}
        <div
          className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
          style={{ backgroundColor: `${maestro.color}15` }}
        >
          <div className="flex items-center gap-1 text-slate-400">
            <GripVertical className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Avatar and name */}
        <div className="flex flex-col items-center py-3">
          <div
            className="relative w-16 h-16 rounded-full overflow-hidden border-2 mb-2"
            style={{ borderColor: maestro.color }}
          >
            <Image
              src={maestro.avatar}
              alt={maestro.displayName}
              fill
              className="object-cover"
            />
          </div>
          <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">
            {maestro.displayName}
          </h4>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5 mt-1">
            {status !== "idle" ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
            ) : (
              <span className={cn("w-2 h-2 rounded-full", getStatusColor())} />
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Last message preview */}
        {lastMessage && (
          <div className="px-3 pb-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
              &ldquo;{lastMessage}&rdquo;
            </p>
          </div>
        )}

        {/* Expand chat button */}
        {onExpand && (
          <div className="px-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={onExpand}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              {t("espandiChat")}
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
