export const stats = [
  {
    rank: 1,
    maestroId: 'maestro-a',
    overall: 85,
    experimentCount: 4,
    scaffolding: 90,
    hinting: 84,
    adaptation: 82,
    misconceptionHandling: 84,
  },
];

export const buckets = [
  { label: 'control', sampleSize: 10, avgTutorBenchScore: 72.5 },
  { label: 'variant', sampleSize: 12, avgTutorBenchScore: 85 },
];

export const results = [
  {
    id: 'ab-1',
    name: 'Tutor comparison',
    status: 'active',
    startDate: '2026-01-01',
    endDate: null,
    buckets,
  },
];

export const experiments = [
  {
    id: 'e-2',
    name: 'Later',
    maestroId: 'maestro-a',
    profileName: 'Profile One',
    createdAt: '2026-01-02',
    turnsCompleted: 8,
    scores: { scaffolding: 100, hinting: null, adaptation: 80, misconceptionHandling: null },
  },
  {
    id: 'e-1',
    name: 'Earlier',
    maestroId: 'maestro-a',
    profileName: 'Profile One',
    hypothesis: 'Improve adaptation',
    createdAt: '2026-01-01',
    turnsCompleted: 5,
    scores: { scaffolding: 80, hinting: 60, adaptation: 70, misconceptionHandling: 90 },
  },
];
