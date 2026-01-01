'use client';

import Image from 'next/image';
import { Sparkles, Heart, GraduationCap, Palette, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Character Settings (Coach & Buddy Selection)
interface CharacterSettingsProps {
  profile: {
    preferredCoach?: 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij';
    preferredBuddy?: 'mario' | 'noemi' | 'enea' | 'bruno' | 'sofia';
    coachBorderColor?: string;
    buddyBorderColor?: string;
  };
  onUpdate: (updates: Partial<CharacterSettingsProps['profile']>) => void;
}

// Available border colors for customization
const BORDER_COLORS = [
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Blu', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Viola', value: '#8B5CF6' },
  { name: 'Arancione', value: '#F97316' },
  { name: 'Rosso', value: '#EF4444' },
  { name: 'Ambra', value: '#F59E0B' },
  { name: 'Indaco', value: '#6366F1' },
  { name: 'Ciano', value: '#06B6D4' },
  { name: 'Lime', value: '#84CC16' },
];

const COACHES = [
  {
    id: 'melissa' as const,
    name: 'Melissa',
    avatar: '/avatars/melissa.jpg',
    description: 'Giovane, intelligente, allegra, paziente, entusiasta',
    tagline: 'Entusiasta e positiva',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    activeBorder: 'border-pink-500 ring-2 ring-pink-500/50',
  },
  {
    id: 'roberto' as const,
    name: 'Roberto',
    avatar: '/avatars/roberto.png',
    description: 'Giovane, calmo, rassicurante, paziente, affidabile',
    tagline: 'Calmo e rassicurante',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    activeBorder: 'border-blue-500 ring-2 ring-blue-500/50',
  },
  {
    id: 'chiara' as const,
    name: 'Chiara',
    avatar: '/avatars/chiara.png',
    description: 'Organizzata, metodica, fresca di studi, empatica',
    tagline: 'Appena laureata, ti capisce',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    activeBorder: 'border-violet-500 ring-2 ring-violet-500/50',
  },
  {
    id: 'andrea' as const,
    name: 'Andrea',
    avatar: '/avatars/andrea.png',
    description: 'Sportiva, energica, pratica, motivazionale',
    tagline: 'Energia e pause attive',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/50',
  },
  {
    id: 'favij' as const,
    name: 'Favij',
    avatar: '/avatars/favij.jpg',
    description: 'Gamer, rilassato, simpatico, creativo, tech-savvy',
    tagline: 'Lo studio come un gioco',
    color: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    activeBorder: 'border-red-500 ring-2 ring-red-500/50',
  },
];

const BUDDIES = [
  {
    id: 'mario' as const,
    name: 'Mario',
    avatar: '/avatars/mario.jpg',
    description: 'Amichevole, ironico, comprensivo, alla mano',
    tagline: 'Il tuo amico che ti capisce',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/50',
  },
  {
    id: 'noemi' as const,
    name: 'Noemi',
    avatar: '/avatars/noemi.png',
    description: 'Empatica, solare, accogliente, buona ascoltatrice',
    tagline: 'La tua amica che ti ascolta',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/50',
  },
  {
    id: 'enea' as const,
    name: 'Enea',
    avatar: '/avatars/enea.png',
    description: 'Allegro, positivo, spiritoso, energico',
    tagline: 'Ti tira su il morale',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/50',
  },
  {
    id: 'bruno' as const,
    name: 'Bruno',
    avatar: '/avatars/bruno.png',
    description: 'Riflessivo, calmo, profondo, buon ascoltatore',
    tagline: 'Ti ascolta davvero',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/50',
  },
  {
    id: 'sofia' as const,
    name: 'Sofia',
    avatar: '/avatars/sofia.png',
    description: 'Creativa, sognatrice, profonda, artistica',
    tagline: 'Vede le cose diversamente',
    color: 'from-pink-500 to-fuchsia-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    activeBorder: 'border-pink-500 ring-2 ring-pink-500/50',
  },
];

export function CharacterSettings({ profile, onUpdate }: CharacterSettingsProps) {
  const selectedCoach = profile.preferredCoach || 'melissa';
  const selectedBuddy = profile.preferredBuddy || 'mario';

  return (
    <div className="space-y-8">
      {/* Coach Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Il Tuo Coach di Apprendimento
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Il coach ti aiuta a sviluppare il tuo metodo di studio e diventare autonomo
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COACHES.map((coach) => (
              <button
                key={coach.id}
                onClick={() => onUpdate({ preferredCoach: coach.id })}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  coach.bgColor,
                  selectedCoach === coach.id
                    ? coach.activeBorder
                    : `${coach.borderColor} hover:scale-[1.02]`
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'w-16 h-16 rounded-full overflow-hidden border-2',
                    selectedCoach === coach.id ? 'border-white shadow-lg' : 'border-slate-200 dark:border-slate-700'
                  )}>
                    <Image
                      src={coach.avatar}
                      alt={coach.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  {selectedCoach === coach.id && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    {coach.name}
                  </h3>
                  <p className={cn(
                    'text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent',
                    coach.color
                  )}>
                    {coach.tagline}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {coach.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buddy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Il Tuo MirrorBuddy
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Il buddy e un amico della tua eta che capisce le tue difficolta e ti supporta
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUDDIES.map((buddy) => (
              <button
                key={buddy.id}
                onClick={() => onUpdate({ preferredBuddy: buddy.id })}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  buddy.bgColor,
                  selectedBuddy === buddy.id
                    ? buddy.activeBorder
                    : `${buddy.borderColor} hover:scale-[1.02]`
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'w-16 h-16 rounded-full overflow-hidden border-2',
                    selectedBuddy === buddy.id ? 'border-white shadow-lg' : 'border-slate-200 dark:border-slate-700'
                  )}>
                    <Image
                      src={buddy.avatar}
                      alt={buddy.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  {selectedBuddy === buddy.id && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    {buddy.name}
                  </h3>
                  <p className={cn(
                    'text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent',
                    buddy.color
                  )}>
                    {buddy.tagline}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {buddy.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-500" />
            Personalizza i Colori
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Scegli i colori dei bordi per riconoscere coach e buddy negli avatar
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coach Border Color */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Colore bordo Coach ({COACHES.find(c => c.id === selectedCoach)?.name})
            </h4>
            <div className="flex flex-wrap gap-2">
              {BORDER_COLORS.map((color) => (
                <button
                  key={`coach-${color.value}`}
                  onClick={() => onUpdate({ coachBorderColor: color.value })}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110',
                    profile.coachBorderColor === color.value
                      ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {profile.coachBorderColor === color.value && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
              <button
                onClick={() => onUpdate({ coachBorderColor: undefined })}
                className={cn(
                  'w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-110 flex items-center justify-center',
                  !profile.coachBorderColor && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                )}
                title="Predefinito"
              >
                <span className="text-xs text-slate-500">Auto</span>
              </button>
            </div>
          </div>

          {/* Buddy Border Color */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Colore bordo Buddy ({BUDDIES.find(b => b.id === selectedBuddy)?.name})
            </h4>
            <div className="flex flex-wrap gap-2">
              {BORDER_COLORS.map((color) => (
                <button
                  key={`buddy-${color.value}`}
                  onClick={() => onUpdate({ buddyBorderColor: color.value })}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110',
                    profile.buddyBorderColor === color.value
                      ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {profile.buddyBorderColor === color.value && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
              <button
                onClick={() => onUpdate({ buddyBorderColor: undefined })}
                className={cn(
                  'w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-110 flex items-center justify-center',
                  !profile.buddyBorderColor && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                )}
                title="Predefinito"
              >
                <span className="text-xs text-slate-500">Auto</span>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Anteprima
            </h4>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-4 mx-auto"
                  style={{ borderColor: profile.coachBorderColor || '#3B82F6' }}
                >
                  <Image
                    src={COACHES.find(c => c.id === selectedCoach)?.avatar || '/avatars/melissa.jpg'}
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
                  style={{ borderColor: profile.buddyBorderColor || '#10B981' }}
                >
                  <Image
                    src={BUDDIES.find(b => b.id === selectedBuddy)?.avatar || '/avatars/mario.jpg'}
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
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">
              Il Triangolo del Supporto
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Il coach ti insegna il metodo, il buddy ti supporta emotivamente, e i Professori ti spiegano le materie.
              Insieme formano il tuo team di apprendimento personalizzato!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
