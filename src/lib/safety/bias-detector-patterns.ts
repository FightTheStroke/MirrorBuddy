/**
 * Bias Detection Patterns — Multilingual (IT/EN)
 * EU AI Act Art. 10 Compliance
 *
 * Separated from bias-detector.ts to keep files under 250 lines.
 * Categories: gender, racial/ethnic, age, disability, socioeconomic,
 * cultural, and educational ability bias.
 */

import type { BiasCategory, BiasSeverity } from './bias-detector';

export interface BiasPattern {
  pattern: RegExp;
  category: BiasCategory;
  severity: BiasSeverity;
  reason: string;
  suggestion: string;
}

export const BIAS_PATTERNS: BiasPattern[] = [
  // --- Gender bias ---
  {
    pattern: /\b(le donne|le ragazze) (non )?(possono|sanno|capiscono|sono capaci)\b/gi,
    category: 'gender',
    severity: 'high',
    reason: 'Gender-based capability generalization',
    suggestion: 'Avoid generalizing abilities by gender',
  },
  {
    pattern: /\b(gli uomini|i ragazzi) (non )?(possono|sanno|capiscono|sono capaci)\b/gi,
    category: 'gender',
    severity: 'high',
    reason: 'Gender-based capability generalization',
    suggestion: 'Avoid generalizing abilities by gender',
  },
  {
    pattern: /\b(women|girls) (can't|cannot|don't|aren't able to|are bad at)\b/gi,
    category: 'gender',
    severity: 'high',
    reason: 'Gender-based capability limitation',
    suggestion: 'Remove gender-based ability claims',
  },
  {
    pattern: /\b(men|boys) (can't|cannot|don't|aren't able to|are bad at)\b/gi,
    category: 'gender',
    severity: 'high',
    reason: 'Gender-based capability limitation',
    suggestion: 'Remove gender-based ability claims',
  },
  {
    pattern: /\b(lavori? (da|per) (uomin|donn)|mestieri? (maschi|femmini))/gi,
    category: 'gender',
    severity: 'medium',
    reason: 'Gendered occupation stereotyping',
    suggestion: 'Present all careers as gender-neutral',
  },
  {
    pattern: /\b(boys are naturally|girls are naturally) (better|worse|stronger|weaker)\b/gi,
    category: 'gender',
    severity: 'high',
    reason: 'Naturalistic gender stereotype',
    suggestion: 'Avoid claims of inherent gender differences in abilities',
  },

  // --- Racial/ethnic bias ---
  {
    pattern: /\b(quella razza|razze (inferiori|superiori))/gi,
    category: 'racial_ethnic',
    severity: 'critical',
    reason: 'Racial hierarchy language',
    suggestion: 'Remove racial categorization language entirely',
  },
  {
    pattern: /\b(i [a-z]+i sono) (tutti|sempre|naturalmente) (pigr|criminal|pericolos|violen)/gi,
    category: 'racial_ethnic',
    severity: 'critical',
    reason: 'Ethnic group negative generalization',
    suggestion: 'Never generalize traits to ethnic groups',
  },
  {
    pattern: /\b(those people|these people|they all) (are|always|never)\b/gi,
    category: 'racial_ethnic',
    severity: 'medium',
    reason: 'Potential othering language',
    suggestion: 'Be specific rather than using collective othering',
  },

  // --- Age bias ---
  {
    pattern: /\b(i giovani (non capiscono|non sanno)|alla tua età non)\b/gi,
    category: 'age',
    severity: 'medium',
    reason: 'Age-based capability dismissal (harmful in educational context)',
    suggestion: 'Encourage learning regardless of age',
  },
  {
    pattern: /\b(too young to understand|kids (can't|don't) understand)\b/gi,
    category: 'age',
    severity: 'medium',
    reason: 'Age-based learning dismissal',
    suggestion: 'Adapt explanation level without dismissing capability',
  },

  // --- Disability bias ---
  {
    pattern: /(handicappat|ritardat|mongoloide|deficient|subnormal)/gi,
    category: 'disability',
    severity: 'critical',
    reason: 'Ableist slur or outdated disability terminology',
    suggestion: 'Use person-first language (e.g., "persona con disabilità")',
  },
  {
    pattern: /\b(suffering from|afflicted with|victim of) (dyslexia|adhd|autism)\b/gi,
    category: 'disability',
    severity: 'medium',
    reason: 'Negative framing of learning differences',
    suggestion: 'Use neutral language: "has dyslexia" or "is autistic"',
  },
  {
    pattern: /(non (riesce|può) perché (è|ha)) (disless|adhd|autis)/gi,
    category: 'disability',
    severity: 'medium',
    reason: 'Attributing inability to disability',
    suggestion: 'Focus on support strategies, not limitations',
  },

  // --- Socioeconomic bias ---
  {
    pattern: /\b(i poveri (non|sono)|chi non ha soldi (non|è))\b/gi,
    category: 'socioeconomic',
    severity: 'high',
    reason: 'Socioeconomic stereotyping',
    suggestion: 'Avoid linking economic status to capability',
  },
  {
    pattern: /\b(poor (people|kids|students) (can't|don't|won't|never))\b/gi,
    category: 'socioeconomic',
    severity: 'high',
    reason: 'Socioeconomic capability limitation',
    suggestion: 'Focus on access barriers, not inherent limitations',
  },

  // --- Cultural bias ---
  {
    pattern: /(popoli? (primitiv|arretrat|incivil|selvaggi))/gi,
    category: 'cultural',
    severity: 'critical',
    reason: 'Cultural hierarchy language',
    suggestion: 'Use respectful, non-hierarchical cultural descriptions',
  },

  // --- Educational ability bias ---
  {
    pattern: /(sei (stupi|scemo|ignorant|incapac)|non sei (portato|capace|intelligente))/gi,
    category: 'educational_ability',
    severity: 'critical',
    reason: 'Direct intellectual insult to student',
    suggestion: 'Use growth mindset language: "This is challenging, let\'s try another approach"',
  },
  {
    pattern: /\b(you('re| are) (stupid|dumb|idiot|incapable))\b/gi,
    category: 'educational_ability',
    severity: 'critical',
    reason: 'Direct intellectual insult to student',
    suggestion: 'Use encouraging language focused on effort and strategy',
  },
  {
    pattern: /\b(questo è facile|this is easy|everyone knows|tutti lo sanno)\b/gi,
    category: 'educational_ability',
    severity: 'low',
    reason: 'Minimizing difficulty can discourage struggling students',
    suggestion: 'Acknowledge that topics can be challenging',
  },

  // --- Absolute generalizations (cross-category) ---
  {
    pattern: /\b(sempre|mai|tutti|nessuno)\b.*\b(sono|fanno|pensano|credono)\b/gi,
    category: 'cultural',
    severity: 'low',
    reason: 'Absolute generalization (potential bias carrier)',
    suggestion: 'Use nuanced language: "some", "often", "in some cases"',
  },
];
