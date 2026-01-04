# Phase 2: Sistema MirrorBucks e Stagioni

**Parent**: [Main Plan](./MirrorBuddyGamification-Main.md)
**Assignee**: CLAUDE 3 (EXECUTOR-LOGIC)
**Priority**: ALTA - Core gamification

---

## OBIETTIVO

Trasformare gamification da "scolastica" a Fortnite/Duolingo style:
- **MirrorBucks** invece di XP
- **Stagioni** = Trimestri (reset contatore)
- **100 Livelli** per stagione
- **Timer sessione** visibile con auto-pausa
- **Achievement/Badge** system
- **Leaderboard** personale
- **Celebrazioni** level-up

---

## EXECUTION TRACKER

| Status | ID | Task | Files | Notes |
|--------|-----|------|-------|-------|
| [ ] | T2-01 | Rename XP → MirrorBucks in store | `src/lib/stores/progress-store.ts` | Mantieni backward compat |
| [ ] | T2-02 | Aggiungere Season logic | `src/lib/stores/progress-store.ts` | Trimestre auto-detect |
| [ ] | T2-03 | Creare costanti 100 livelli | `src/lib/constants/mirrorbucks.ts` | Curva progressione |
| [ ] | T2-04 | Creare MirrorBucksDisplay | `src/components/gamification/mirrorbucks-display.tsx` | UI principale |
| [ ] | T2-05 | Creare SeasonBanner | `src/components/gamification/season-banner.tsx` | Mostra stagione attuale |
| [ ] | T2-06 | Creare LevelProgressBar | `src/components/gamification/level-progress-bar.tsx` | Barra con "manca X" |
| [ ] | T2-07 | Implementare timer visibile | `src/components/gamification/session-timer.tsx` | Con auto-pausa |
| [ ] | T2-08 | Estendere inactivity monitor | `src/lib/conversation/inactivity-monitor.ts` | Pausa timer, non solo timeout |
| [ ] | T2-09 | Creare Achievement definitions | `src/lib/gamification/achievements.ts` | 20+ badge |
| [ ] | T2-10 | Creare AchievementsPanel | `src/components/gamification/achievements-panel.tsx` | Grid badge |
| [ ] | T2-11 | Creare Leaderboard | `src/components/gamification/leaderboard.tsx` | Confronto temporale |
| [ ] | T2-12 | Creare LevelUpCelebration | `src/components/gamification/level-up-celebration.tsx` | Coriandoli + coach |
| [ ] | T2-13 | Integrare notifiche coach | `src/lib/notifications/triggers.ts` | onMirrorBucksEarned |
| [ ] | T2-14 | Aggiornare API sync | `src/app/api/progress/route.ts` | Season + MirrorBucks |

---

## TASK DETAILS

### T2-01: Rename XP → MirrorBucks
```typescript
// progress-store.ts changes
interface ProgressState {
  mirrorBucks: number      // was: xp
  seasonMirrorBucks: number // new: reset each season
  level: number            // 1-100 per season
  seasonLevel: number      // current season level
  allTimeLevel: number     // cumulative
  // ... rest
}
```

### T2-02: Season Logic
```typescript
// Stagioni = Trimestri scolastici italiani
const SEASONS = {
  1: { name: 'Autunno', start: '09-01', end: '11-30' },
  2: { name: 'Inverno', start: '12-01', end: '02-28' },
  3: { name: 'Primavera', start: '03-01', end: '05-31' },
  4: { name: 'Estate', start: '06-01', end: '08-31' }
}

function getCurrentSeason(): Season {
  const now = new Date()
  // ... logic
}

function getSeasonProgress(userId: string): SeasonProgress {
  return {
    season: getCurrentSeason(),
    mirrorBucks: state.seasonMirrorBucks,
    level: state.seasonLevel,
    daysRemaining: calculateDaysRemaining(),
    history: state.seasonHistory // array of past seasons
  }
}
```

### T2-03: 100 Livelli Fortnite-style
```typescript
// src/lib/constants/mirrorbucks.ts
export const MIRRORBUCKS_PER_LEVEL: number[] = [
  // Livelli 1-10: facili (onboarding)
  100, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  // Livelli 11-30: normali
  700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
  // ... fino a 100
]

export const MIRRORBUCKS_REWARDS = {
  conversationMinute: 5,        // per minuto di studio attivo
  quizCompleted: 30,            // quiz >70%
  quizPerfect: 50,              // quiz 100%
  mindmapCreated: 20,
  flashcardSession: 15,         // sessione FSRS
  demoCompleted: 25,
  summaryGenerated: 15,
  dailyStreak: 10,              // bonus giornaliero
  weeklyStreak: 50,             // 7 giorni consecutivi
  newSubjectExplored: 40,       // prima volta con materia
  sessionCompleted: 20,         // sessione >10 min
}
```

### T2-07: Timer visibile con auto-pausa
- Mostra tempo sessione corrente (MM:SS)
- **AUTO-PAUSA** se:
  - No input (chat/voice) per 60 secondi
  - Tab non attivo (visibilitychange)
  - Browser minimizzato
- Riprende automaticamente quando attività rilevata
- Colore: verde (attivo), giallo (quasi pausa), grigio (pausa)

### T2-09: Achievement Definitions
```typescript
export const ACHIEVEMENTS: Achievement[] = [
  // Onboarding
  { id: 'first_chat', name: 'Prima Parola', icon: '💬', condition: 'firstMessage' },
  { id: 'first_quiz', name: 'Primo Quiz', icon: '📝', condition: 'firstQuiz' },

  // Streak
  { id: 'streak_3', name: 'Costante', icon: '🔥', condition: 'streak >= 3' },
  { id: 'streak_7', name: 'Settimana Perfetta', icon: '⭐', condition: 'streak >= 7' },
  { id: 'streak_30', name: 'Mese da Campione', icon: '🏆', condition: 'streak >= 30' },

  // Livelli
  { id: 'level_10', name: 'Apprendista', icon: '🎓', condition: 'level >= 10' },
  { id: 'level_50', name: 'Studioso', icon: '📚', condition: 'level >= 50' },
  { id: 'level_100', name: 'Maestro', icon: '👑', condition: 'level >= 100' },

  // Esplorazione
  { id: 'all_subjects', name: 'Tuttologia', icon: '🌍', condition: 'allSubjectsVisited' },
  { id: 'all_maestri', name: 'Social Butterfly', icon: '🦋', condition: 'allMaestriMet' },

  // ... altri 10+
]
```

### T2-12: Level Up Celebration
- Componente overlay fullscreen
- Canvas confetti animation (canvas-confetti lib)
- Coach appare e dice frase celebrativa
- Mostra nuovo livello + reward
- Auto-dismiss dopo 5 sec o click

---

## ACCEPTANCE CRITERIA

- [ ] UI mostra "MirrorBucks" invece di "XP" ovunque
- [ ] Stagione corrente visibile con countdown giorni
- [ ] Progress bar mostra livello 1-100 e "manca X per livello Y"
- [ ] Timer sessione visibile, si ferma se inattivo
- [ ] Almeno 20 achievement definiti e sbloccabili
- [ ] Leaderboard mostra confronto giorno/settimana/stagione
- [ ] Level-up trigger celebrazione con coriandoli
- [ ] Coach notifica guadagno MirrorBucks
- [ ] API `/api/progress` accetta/ritorna season data

---

## NEW TYPES

```typescript
// src/types/gamification.ts
interface Season {
  id: number           // 1-4
  name: string         // 'Autunno' | 'Inverno' | 'Primavera' | 'Estate'
  year: number         // 2026
  startDate: Date
  endDate: Date
}

interface SeasonProgress {
  season: Season
  mirrorBucks: number
  level: number        // 1-100
  rank?: number        // for leaderboard
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: Date
  condition: string
}
```

---

## FILE DEPENDENCIES

```
src/lib/
├── stores/progress-store.ts (T2-01, T2-02)
├── constants/mirrorbucks.ts (T2-03) NEW
├── gamification/
│   └── achievements.ts (T2-09) NEW
├── conversation/inactivity-monitor.ts (T2-08)
└── notifications/triggers.ts (T2-13)

src/components/gamification/
├── mirrorbucks-display.tsx (T2-04) NEW
├── season-banner.tsx (T2-05) NEW
├── level-progress-bar.tsx (T2-06) NEW
├── session-timer.tsx (T2-07) NEW
├── achievements-panel.tsx (T2-10) NEW
├── leaderboard.tsx (T2-11) NEW
└── level-up-celebration.tsx (T2-12) NEW

src/app/api/progress/route.ts (T2-14)
```

---

## ESTIMATED COMPLEXITY

| Task | Complexity | LOC New | LOC Modified |
|------|------------|---------|--------------|
| T2-01 | Medium | 0 | 100 |
| T2-02 | Medium | 80 | 50 |
| T2-03 | Low | 120 | 0 |
| T2-04 | Medium | 80 | 0 |
| T2-05 | Low | 60 | 0 |
| T2-06 | Medium | 100 | 0 |
| T2-07 | High | 150 | 0 |
| T2-08 | Medium | 0 | 60 |
| T2-09 | Medium | 150 | 0 |
| T2-10 | Medium | 120 | 0 |
| T2-11 | High | 180 | 0 |
| T2-12 | High | 150 | 0 |
| T2-13 | Low | 0 | 40 |
| T2-14 | Medium | 0 | 80 |

**Total**: ~1190 new LOC, ~330 modified LOC
