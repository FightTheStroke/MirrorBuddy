'use client';

/**
 * @file conversation-drawer.tsx
 * @brief Drawer for viewing conversation history per character
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { ConversationDrawerProps } from './types';

export function ConversationDrawer({
  open,
  onOpenChange,
  characterId,
  characterType,
  onSelectConversation,
  onNewConversation,
}: ConversationDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 sm:w-96 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Storico Conversazioni</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Nuova
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* Search placeholder - T2-01 */}
          <div className="p-4 border-b">
            <div className="text-sm text-muted-foreground">
              Ricerca... (coming in W2)
            </div>
          </div>

          {/* List placeholder - T2-02 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-sm text-muted-foreground text-center py-8">
              Lista conversazioni per {characterType} {characterId}
              <br />
              (coming in W2)
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
