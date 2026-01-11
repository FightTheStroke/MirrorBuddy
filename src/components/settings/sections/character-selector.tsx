'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBorder: string;
}

interface CharacterSelectorProps {
  characters: Character[];
  selectedId: string;
  onSelect: (id: string) => void;
  title: string;
  description: string;
}

export function CharacterSelector({
  characters,
  selectedId,
  onSelect,
  title,
  description,
}: CharacterSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((character) => (
          <button
            key={character.id}
            onClick={() => onSelect(character.id)}
            className={cn(
              'relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
              character.bgColor,
              selectedId === character.id
                ? character.activeBorder
                : `${character.borderColor} hover:scale-[1.02]`
            )}
          >
            <div className="relative flex-shrink-0">
              <div className={cn(
                'w-16 h-16 rounded-full overflow-hidden border-2',
                selectedId === character.id ? 'border-white shadow-lg' : 'border-slate-200 dark:border-slate-700'
              )}>
                <Image
                  src={character.avatar}
                  alt={character.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>
              {selectedId === character.id && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                {character.name}
              </h3>
              <p className={cn(
                'text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent',
                character.color
              )}>
                {character.tagline}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {character.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
