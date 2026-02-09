'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRESETS } from './constants';
import type { AudioPreset } from '@/types';
import { useTranslations } from "next-intl";

interface PresetsSectionProps {
  currentPreset: AudioPreset | null;
  onSelect: (preset: AudioPreset) => void;
}

export function PresetsSection({ currentPreset, onSelect }: PresetsSectionProps) {
  const t = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("presetRapidi")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.preset}
              onClick={() => onSelect(p.preset)}
              variant={currentPreset === p.preset ? 'default' : 'outline'}
              className="h-auto flex-col items-start p-3 text-left"
            >
              <span className="font-medium text-sm">{p.label}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                {p.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
