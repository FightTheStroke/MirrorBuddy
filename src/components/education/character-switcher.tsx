'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { Maestro } from '@/types';
import type { Character, CharacterRole } from './character-switcher/types';
import { ROLE_INFO } from './character-switcher/constants';
import { CharacterChip } from './character-switcher/components/character-chip';
import { CharacterCard } from './character-switcher/components/character-card';
import { SwitcherHeader } from './character-switcher/components/switcher-header';
import { useCharacterSwitcher } from './character-switcher/hooks/use-character-switcher';

const ICON_MAP = {
  Heart,
  Users,
  GraduationCap,
};

export type { Character, CharacterRole } from './character-switcher/types';
export { SUPPORT_CHARACTERS } from './character-switcher/constants';

interface CharacterSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: Character) => void;
  currentCharacterId?: string;
  maestri?: Maestro[];
  recentCharacterIds?: string[];
  className?: string;
}

export function CharacterSwitcher({
  isOpen,
  onClose,
  onSelectCharacter,
  currentCharacterId,
  maestri = [],
  recentCharacterIds = [],
  className,
}: CharacterSwitcherProps) {
  const { settings } = useAccessibilityStore();

  const {
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    recentCharacters,
    filteredCharacters,
    groupedCharacters,
    handleSelect,
  } = useCharacterSwitcher({
    maestri,
    recentCharacterIds,
    currentCharacterId,
    onSelectCharacter,
    onClose,
  });

  const handleBackdropClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full sm:max-w-lg max-h-[85vh] overflow-hidden',
            'rounded-t-3xl sm:rounded-2xl shadow-2xl',
            settings.highContrast
              ? 'bg-black border-2 border-yellow-400'
              : 'bg-white dark:bg-slate-900',
            className
          )}
        >
          <SwitcherHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            onClose={onClose}
          />

          <div className="overflow-y-auto max-h-[60vh] p-4 space-y-6">
            {recentCharacters.length > 0 && !searchQuery && selectedRole === 'all' && (
              <section>
                <h3
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1',
                    settings.highContrast ? 'text-yellow-400' : 'text-slate-500'
                  )}
                >
                  <Star className="w-3 h-3" />
                  Recenti
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentCharacters.map((character) => (
                    <CharacterChip
                      key={character.id}
                      character={character}
                      isSelected={character.id === currentCharacterId}
                      onClick={() => handleSelect(character)}
                    />
                  ))}
                </div>
              </section>
            )}

            {selectedRole === 'all' ? (
              Object.entries(groupedCharacters).map(
                ([role, characters]) =>
                  characters.length > 0 && (
                    <section key={role}>
                      <h3
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1',
                          ROLE_INFO[role as CharacterRole].color
                        )}
                      >
                        {(() => {
                          const Icon = ICON_MAP[ROLE_INFO[role as CharacterRole].iconName];
                          return <Icon className="w-3 h-3" />;
                        })()}
                        {ROLE_INFO[role as CharacterRole].label}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {characters.map((character) => (
                          <CharacterCard
                            key={character.id}
                            character={character}
                            isSelected={character.id === currentCharacterId}
                            onClick={() => handleSelect(character)}
                          />
                        ))}
                      </div>
                    </section>
                  )
              )
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isSelected={character.id === currentCharacterId}
                    onClick={() => handleSelect(character)}
                  />
                ))}
              </div>
            )}

            {filteredCharacters.length === 0 && (
              <div className="text-center py-8">
                <p
                  className={cn(
                    'text-sm',
                    settings.highContrast ? 'text-gray-400' : 'text-slate-500'
                  )}
                >
                  Nessun personaggio trovato
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CharacterSwitcher;
