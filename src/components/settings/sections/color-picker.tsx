'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BorderColor {
  name: string;
  value: string;
}

interface ColorPickerProps {
  colors: BorderColor[];
  selectedValue: string | undefined;
  onSelect: (value: string | undefined) => void;
  characterName: string;
  characterAvatar?: string;
}

export function ColorPicker({
  colors,
  selectedValue,
  onSelect,
  characterName,
}: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Colore bordo {characterName}
      </h4>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={`color-${color.value}`}
            onClick={() => onSelect(color.value)}
            className={cn(
              'w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110',
              selectedValue === color.value
                ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                : 'border-transparent'
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          >
            {selectedValue === color.value && (
              <Check className="w-5 h-5 text-white mx-auto" />
            )}
          </button>
        ))}
        <button
          onClick={() => onSelect(undefined)}
          className={cn(
            'w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-110 flex items-center justify-center',
            !selectedValue && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
          )}
          title="Predefinito"
        >
          <span className="text-xs text-slate-500">Auto</span>
        </button>
      </div>
    </div>
  );
}

interface ColorPreviewProps {
  coachColor: string | undefined;
  buddyColor: string | undefined;
  coachAvatar: string;
  buddyAvatar: string;
}

export function ColorPreview({
  coachColor,
  buddyColor,
  coachAvatar,
  buddyAvatar,
}: ColorPreviewProps) {
  return (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Anteprima
      </h4>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-4 mx-auto"
            style={{ borderColor: coachColor || '#3B82F6' }}
          >
            <Image
              src={coachAvatar}
              alt="Coach"
              width={64}
              height={64}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Coach</span>
        </div>
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-4 mx-auto"
            style={{ borderColor: buddyColor || '#10B981' }}
          >
            <Image
              src={buddyAvatar}
              alt="Buddy"
              width={64}
              height={64}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Buddy</span>
        </div>
      </div>
    </div>
  );
}
