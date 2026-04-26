import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Character, CharacterRole } from '../types';
import type { Maestro } from '@/types';
import { SUPPORT_CHARACTERS } from '../constants';

interface UseCharacterSwitcherProps {
  maestri?: Maestro[];
  recentCharacterIds?: string[];
  currentCharacterId?: string;
  onSelectCharacter: (character: Character) => void;
  onClose: () => void;
}

export function useCharacterSwitcher({
  maestri = [],
  recentCharacterIds = [],
  currentCharacterId,
  onSelectCharacter,
  onClose,
}: UseCharacterSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<CharacterRole | 'all'>('all');
  const _currentCharacterId = currentCharacterId; // Mark as unused

  const maestriCharacters: Character[] = useMemo(
    () =>
      maestri.map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        color: m.color,
        role: 'maestro' as const,
        description: m.specialty,
        specialty: m.specialty,
        greeting: m.greeting,
        systemPrompt: m.systemPrompt,
      })),
    [maestri]
  );

  const allCharacters = useMemo(
    () => [...SUPPORT_CHARACTERS, ...maestriCharacters],
    [maestriCharacters]
  );

  const recentCharacters = useMemo(
    () =>
      recentCharacterIds
        .map((id) => allCharacters.find((c) => c.id === id))
        .filter((c): c is Character => c !== undefined)
        .slice(0, 3),
    [recentCharacterIds, allCharacters]
  );

  const filteredCharacters = useMemo(() => {
    let result = allCharacters;

    if (selectedRole !== 'all') {
      result = result.filter((c) => c.role === selectedRole);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.specialty?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allCharacters, selectedRole, searchQuery]);

  const groupedCharacters = useMemo(() => {
    const groups: Record<CharacterRole, Character[]> = {
      learning_coach: [],
      buddy: [],
      maestro: [],
    };

    filteredCharacters.forEach((c) => {
      groups[c.role].push(c);
    });

    return groups;
  }, [filteredCharacters]);

  const handleSelect = useCallback(
    (character: Character) => {
      onSelectCharacter(character);
      onClose();
    },
    [onSelectCharacter, onClose]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return {
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    recentCharacters,
    filteredCharacters,
    groupedCharacters,
    handleSelect,
  };
}

