"use client";

import { Sparkles, Heart, GraduationCap, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharacterSelector } from "./character-selector";
import { ColorPicker, ColorPreview } from "./color-picker";
import { BORDER_COLORS, COACHES, BUDDIES } from "./character-settings-data";
import { useTranslations } from "next-intl";

interface CharacterSettingsProps {
  profile: {
    preferredCoach?:
      | "melissa"
      | "roberto"
      | "chiara"
      | "andrea"
      | "favij"
      | "laura";
    preferredBuddy?: "mario" | "noemi" | "enea" | "bruno" | "sofia" | "marta";
    coachBorderColor?: string;
    buddyBorderColor?: string;
  };
  onUpdate: (updates: Partial<CharacterSettingsProps["profile"]>) => void;
}

export function CharacterSettings({
  profile,
  onUpdate,
}: CharacterSettingsProps) {
  const t = useTranslations("settings");
  const selectedCoach = profile.preferredCoach || "melissa";
  const selectedBuddy = profile.preferredBuddy || "mario";
  const coachData = COACHES.find((c) => c.id === selectedCoach);
  const buddyData = BUDDIES.find((b) => b.id === selectedBuddy);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {t("ilTuoCoachDiApprendimento")}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("ilCoachTiAiutaASviluppareIlTuoMetodoDiStudioEDiven")}
            {t("autonomo")}
          </p>
        </CardHeader>
        <CardContent>
          <CharacterSelector
            characters={COACHES}
            selectedId={selectedCoach}
            onSelect={(id) =>
              onUpdate({
                preferredCoach: id as
                  | "melissa"
                  | "roberto"
                  | "chiara"
                  | "andrea"
                  | "favij"
                  | "laura",
              })
            }
            title=""
            description=""
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            {t("ilTuoMirrorbuddy")}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("ilBuddyEUnAmicoDellaTuaEtaCheCapisceLeTueDifficolt")}
            {t("supporta")}
          </p>
        </CardHeader>
        <CardContent>
          <CharacterSelector
            characters={BUDDIES}
            selectedId={selectedBuddy}
            onSelect={(id) =>
              onUpdate({
                preferredBuddy: id as
                  | "mario"
                  | "noemi"
                  | "enea"
                  | "bruno"
                  | "sofia"
                  | "marta",
              })
            }
            title=""
            description=""
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-500" />
            {t("personalizzaIColori")}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("scegliIColoriDeiBordiPerRiconoscereCoachEBuddyNegl")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {coachData && (
            <ColorPicker
              colors={BORDER_COLORS}
              selectedValue={profile.coachBorderColor}
              onSelect={(v) => onUpdate({ coachBorderColor: v })}
              characterName={coachData.name}
            />
          )}
          {buddyData && (
            <ColorPicker
              colors={BORDER_COLORS}
              selectedValue={profile.buddyBorderColor}
              onSelect={(v) => onUpdate({ buddyBorderColor: v })}
              characterName={buddyData.name}
            />
          )}
          {coachData && buddyData && (
            <ColorPreview
              coachColor={profile.coachBorderColor}
              buddyColor={profile.buddyBorderColor}
              coachAvatar={coachData.avatar}
              buddyAvatar={buddyData.avatar}
            />
          )}
        </CardContent>
      </Card>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">
              {t("ilTriangoloDelSupporto")}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {t("ilCoachTiInsegnaIlMetodoIlBuddyTiSupportaEmotivame")}
              {t("characterSettingsTeamDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
