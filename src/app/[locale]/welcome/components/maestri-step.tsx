'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { cn } from '@/lib/utils';
import { useOnboardingTTS, ONBOARDING_SCRIPTS } from '@/lib/hooks/use-onboarding-tts';

const FEATURED_IDS = ['euclide', 'leonardo', 'curie', 'shakespeare', 'feynman', 'darwin'];

interface MaestriStepProps {
  useWebSpeechFallback?: boolean;
  onAzureUnavailable?: () => void;
}

interface MaestroCard {
  id: string;
  name: string;
  avatar: string;
  color: string;
  specialty: string;
  subject: string;
}

export function MaestriStep(_props: MaestriStepProps) {
  const t = useTranslations('welcome.maestriStep');
  const { data, nextStep, prevStep, isVoiceMuted, setVoiceMuted } = useOnboardingStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [maestri, setMaestri] = useState<MaestroCard[]>([]);

  useEffect(() => {
    import('@/data').then(({ maestri: all }) => {
      setMaestri(
        all.map(({ id, name, avatar, color, specialty, subject }) => ({
          id,
          name,
          avatar,
          color,
          specialty,
          subject,
        })),
      );
    });
  }, []);

  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.maestri,
    delay: 500,
  });

  const toggleMute = () => {
    if (isPlaying) stop();
    setVoiceMuted(!isVoiceMuted);
  };

  const sortedMaestri = useMemo(
    () =>
      [...maestri].sort((a, b) => {
        const aF = FEATURED_IDS.includes(a.id);
        const bF = FEATURED_IDS.includes(b.id);
        if (aF && !bF) return -1;
        if (!aF && bF) return 1;
        if (aF && bF) return FEATURED_IDS.indexOf(a.id) - FEATURED_IDS.indexOf(b.id);
        return a.name.localeCompare(b.name);
      }),
    [maestri],
  );

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      return () => ref.removeEventListener('scroll', updateScrollButtons);
    }
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardContent className="p-8 space-y-6">
        <MaestriHeader
          t={t}
          name={data.name}
          count={maestri.length}
          isVoiceMuted={isVoiceMuted}
          isPlaying={isPlaying}
          onToggleMute={toggleMute}
        />
        <MaestriCarousel
          t={t}
          scrollRef={scrollRef}
          sortedMaestri={sortedMaestri}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScroll={scroll}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50"
        >
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <strong>{t('howItWorks')}</strong> {t('howItWorksDesc')}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3 pt-2"
        >
          <Button
            onClick={() => {
              stop();
              prevStep();
            }}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            {t('backButton')}
          </Button>
          <Button
            onClick={() => {
              stop();
              nextStep();
            }}
            size="lg"
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
          >
            {t('nextButton')}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}

function MaestriHeader({
  t,
  name,
  count,
  isVoiceMuted,
  isPlaying,
  onToggleMute,
}: {
  t: ReturnType<typeof useTranslations>;
  name: string;
  count: number;
  isVoiceMuted: boolean;
  isPlaying: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow">
        <Image
          src="/avatars/melissa.webp"
          alt="Melissa"
          width={56}
          height={56}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {t('heading', { name })}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('subtitle', { count })}</p>
      </div>
      <button
        onClick={onToggleMute}
        className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
        aria-label={isVoiceMuted ? t('enableVoice') : t('disableVoice')}
        title={isVoiceMuted ? t('enableVoice') : t('disableVoice')}
      >
        {isVoiceMuted ? (
          <VolumeX className="w-5 h-5 text-pink-600 dark:text-pink-400" />
        ) : (
          <Volume2
            className={cn('w-5 h-5 text-pink-600 dark:text-pink-400', isPlaying && 'animate-pulse')}
          />
        )}
      </button>
    </div>
  );
}

function MaestriCarousel({
  t,
  scrollRef,
  sortedMaestri,
  canScrollLeft,
  canScrollRight,
  onScroll,
}: {
  t: ReturnType<typeof useTranslations>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  sortedMaestri: MaestroCard[];
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScroll: (dir: 'left' | 'right') => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => onScroll('left')}
        disabled={!canScrollLeft}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-lg flex items-center justify-center transition-opacity',
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-label={t('scrollLeft')}
      >
        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={() => onScroll('right')}
        disabled={!canScrollRight}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-lg flex items-center justify-center transition-opacity',
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-label={t('scrollRight')}
      >
        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2"
        style={{ scrollSnapType: 'x mandatory' }}
        role="region"
        aria-label={t('carouselLabel')}
      >
        {sortedMaestri.map((maestro, i) => (
          <motion.div
            key={maestro.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="flex-shrink-0 w-36"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div
              className="p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-pink-300 dark:hover:border-pink-700 transition-all"
              style={{
                borderColor: FEATURED_IDS.includes(maestro.id) ? maestro.color : undefined,
              }}
            >
              <div className="relative w-20 h-20 mx-auto mb-2">
                <div
                  className="w-full h-full rounded-full overflow-hidden border-2"
                  style={{ borderColor: maestro.color }}
                >
                  <Image
                    src={maestro.avatar}
                    alt={maestro.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
                {FEATURED_IDS.includes(maestro.id) && (
                  <div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: maestro.color }}
                  >
                    <GraduationCap className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                  {maestro.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {maestro.specialty || maestro.subject}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
