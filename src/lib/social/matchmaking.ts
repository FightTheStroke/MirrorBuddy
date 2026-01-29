/**
 * 🤝 Social Matchmaking Engine
 * 
 * Pairs students for collaborative learning sessions based on 
 * neurodivergent affinity and complementary skills.
 */

export interface StudentMatchProfile {
  userId: string;
  neuroProfile: 'ADHD' | 'Dyslexia' | 'Autism' | 'Standard';
  subjectStrengths: string[];
  subjectWeaknesses: string[];
}

/**
 * Calculates how well two students might work together.
 * Goal: Pair students where one's strength covers the other's weakness.
 */
export function calculateMatchAffinity(s1: StudentMatchProfile, s2: StudentMatchProfile): number {
  let score = 0.5; // Base neutrality

  // Rule 1: Neurodivergent Complementarity
  // ADHD + Dyslexia often work well together (creative brainstorming + visual focus)
  if ((s1.neuroProfile === 'ADHD' && s2.neuroProfile === 'Dyslexia') ||
      (s1.neuroProfile === 'Dyslexia' && s2.neuroProfile === 'ADHD')) {
    score += 0.3;
  }

  // Rule 2: Subject Complementarity
  // If Student A is good at Math and Student B is struggling with Math, high affinity
  const s1HelpsS2 = s1.subjectStrengths.some(subj => s2.subjectWeaknesses.includes(subj));
  const s2HelpsS1 = s2.subjectStrengths.some(subj => s1.subjectWeaknesses.includes(subj));

  if (s1HelpsS2) score += 0.2;
  if (s2HelpsS1) score += 0.2;

  // Rule 3: Avoid clashing profiles (e.g., two very low attention students might need a moderator)
  if (s1.neuroProfile === 'ADHD' && s2.neuroProfile === 'ADHD') {
    score -= 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Finds the best partner for a student from a pool of active users.
 */
export function findBestPartner(student: StudentMatchProfile, pool: StudentMatchProfile[]): StudentMatchProfile | null {
  return pool
    .filter(p => p.userId !== student.userId)
    .map(p => ({ profile: p, score: calculateMatchAffinity(student, p) }))
    .sort((a, b) => b.score - a.score)[0]?.profile || null;
}
