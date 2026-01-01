'use client';

// ============================================================================
// COLLABORATOR AVATARS COMPONENT
// Shows avatars of users collaborating on the mindmap
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import React, { memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import type { RoomParticipant } from '@/lib/collab/mindmap-room';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CollaboratorAvatarsProps {
  participants: RoomParticipant[];
  selections: Map<string, string>; // userId -> nodeId
  maxVisible?: number;
  onInvite?: () => void;
}

/**
 * Renders avatar stack for all collaborators
 */
export const CollaboratorAvatars = memo(function CollaboratorAvatars({
  participants,
  selections,
  maxVisible = 5,
  onInvite,
}: CollaboratorAvatarsProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const hiddenCount = Math.max(0, participants.length - maxVisible);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Participant count badge */}
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Users className="h-3 w-3" />
          <span>{participants.length + 1}</span>
        </div>

        {/* Avatar stack */}
        <div className="flex -space-x-2">
          <AnimatePresence mode="popLayout">
            {visibleParticipants.map((participant, index) => (
              <CollaboratorAvatar
                key={participant.id}
                participant={participant}
                isEditing={selections.has(participant.id)}
                index={index}
              />
            ))}
          </AnimatePresence>

          {/* Hidden count */}
          {hiddenCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-700 dark:text-slate-300"
            >
              +{hiddenCount}
            </motion.div>
          )}
        </div>

        {/* Invite button */}
        {onInvite && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onInvite}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500 dark:border-slate-600 dark:hover:border-blue-500"
                aria-label="Invita collaboratori"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent>Invita collaboratori</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
});

interface CollaboratorAvatarProps {
  participant: RoomParticipant;
  isEditing: boolean;
  index: number;
}

const CollaboratorAvatar = memo(function CollaboratorAvatar({
  participant,
  isEditing,
  index,
}: CollaboratorAvatarProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.5, x: -10 }}
          transition={{ delay: index * 0.05 }}
          className="relative"
          style={{ zIndex: 10 - index }}
        >
          {/* Avatar */}
          <div
            className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white dark:border-slate-800"
            style={{ boxShadow: isEditing ? `0 0 0 2px ${participant.color}` : undefined }}
          >
            {participant.avatar ? (
              <Image
                src={participant.avatar}
                alt={participant.name}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Editing indicator */}
          {isEditing && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800"
              style={{ backgroundColor: participant.color }}
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="h-full w-full rounded-full"
                style={{ backgroundColor: participant.color }}
              />
            </motion.div>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-medium">{participant.name}</p>
          {isEditing && (
            <p className="text-xs text-slate-400">Sta modificando...</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

export default CollaboratorAvatars;
