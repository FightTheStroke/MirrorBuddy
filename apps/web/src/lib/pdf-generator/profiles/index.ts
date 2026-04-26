/**
 * DSA Accessibility Profiles for PDF Generation
 * Maps 7 DSA types to specific styling configurations
 */

import type { DSAProfile, ProfileConfig } from '../types';

// Dyslexia profile - Focus on readability
export const dyslexiaProfile: ProfileConfig = {
  name: 'dyslexia',
  nameIt: 'Dislessia',
  description: 'Optimized for dyslexic readers with enhanced spacing and contrast',
  fontFamily: 'Helvetica',
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.12,
  wordSpacing: 0.16,
  backgroundColor: '#fffbeb',
  textColor: '#1e293b',
  paragraphSpacing: 24,
  headingScale: 1.4,
  options: {
    dyslexiaFont: true,
    warmBackground: true,
    extraSpacing: true,
  },
};

// Dyscalculia profile - Enhanced number visibility
export const dyscalculiaProfile: ProfileConfig = {
  name: 'dyscalculia',
  nameIt: 'Discalculia',
  description: 'Enhanced visibility for numbers and mathematical operations',
  fontFamily: 'Helvetica',
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0.08,
  wordSpacing: 0.1,
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  paragraphSpacing: 20,
  headingScale: 1.3,
  options: {
    largeNumbers: true,
    coloredOperators: true,
    gridLines: true,
    stepByStep: true,
  },
};

// Dysgraphia profile - Clear structure and spacing
export const dysgraphiaProfile: ProfileConfig = {
  name: 'dysgraphia',
  nameIt: 'Disgrafia',
  description: 'Structured layout with clear visual hierarchy',
  fontFamily: 'Helvetica',
  fontSize: 16,
  lineHeight: 2.0,
  letterSpacing: 0.1,
  wordSpacing: 0.12,
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  paragraphSpacing: 24,
  headingScale: 1.35,
  options: {
    borderBoxes: true,
    structuredLayout: true,
    mediumWeight: true,
  },
};

// Dysorthography profile - Spelling support
export const dysorthographyProfile: ProfileConfig = {
  name: 'dysorthography',
  nameIt: 'Disortografia',
  description: 'Enhanced spelling patterns and word structure visibility',
  fontFamily: 'Helvetica',
  fontSize: 16,
  lineHeight: 1.7,
  letterSpacing: 0.08,
  wordSpacing: 0.1,
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  paragraphSpacing: 20,
  headingScale: 1.3,
  options: {
    underlinePatterns: true,
    syllableHighlight: true,
    spellingHints: true,
    colorCodingRoots: true,
  },
};

// ADHD profile - Minimal distractions, clear structure
export const adhdProfile: ProfileConfig = {
  name: 'adhd',
  nameIt: 'DOP/ADHD',
  description: 'Distraction-free with clear sections and progress indicators',
  fontFamily: 'Helvetica',
  fontSize: 14,
  lineHeight: 1.6,
  letterSpacing: 0.04,
  wordSpacing: 0.08,
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  paragraphSpacing: 28,
  headingScale: 1.4,
  options: {
    distractionFree: true,
    clearSections: true,
    bulletPoints: true,
    shortParagraphs: true,
    progressIndicators: true,
    highlightKeyTerms: true,
  },
};

// Dyspraxia profile - Reading support
export const dyspraxiaProfile: ProfileConfig = {
  name: 'dyspraxia',
  nameIt: 'Disprassia',
  description: 'Chunked text with reading time estimates and pause markers',
  fontFamily: 'Helvetica',
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0.08,
  wordSpacing: 0.1,
  backgroundColor: '#fefce8',
  textColor: '#1e293b',
  paragraphSpacing: 24,
  headingScale: 1.35,
  options: {
    syllableUnderlines: true,
    readingTimeEstimate: true,
    pauseMarkers: true,
    chunkedText: true,
  },
};

// Stuttering profile - Smooth reading flow
export const stutteringProfile: ProfileConfig = {
  name: 'stuttering',
  nameIt: 'Balbuzie',
  description: 'Short sentences with breathing marks for reading aloud',
  fontFamily: 'Helvetica',
  fontSize: 16,
  lineHeight: 1.9,
  letterSpacing: 0.06,
  wordSpacing: 0.1,
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  paragraphSpacing: 28,
  headingScale: 1.3,
  options: {
    simplePunctuation: true,
    shortSentences: true,
    breathingMarks: true,
    rhythmicLayout: true,
  },
};

// Profile lookup map
export const profiles: Record<DSAProfile, ProfileConfig> = {
  dyslexia: dyslexiaProfile,
  dyscalculia: dyscalculiaProfile,
  dysgraphia: dysgraphiaProfile,
  dysorthography: dysorthographyProfile,
  adhd: adhdProfile,
  dyspraxia: dyspraxiaProfile,
  stuttering: stutteringProfile,
};

/**
 * Get profile configuration by DSA type
 */
export function getProfile(profileType: DSAProfile): ProfileConfig {
  return profiles[profileType];
}

/**
 * Get all available profiles
 */
export function getAllProfiles(): ProfileConfig[] {
  return Object.values(profiles);
}

/**
 * Operator colors for dyscalculia profile
 */
export const operatorColors = {
  plus: '#059669',
  minus: '#dc2626',
  multiply: '#2563eb',
  divide: '#7c3aed',
  equals: '#64748b',
};

/**
 * Word part colors for dysorthography profile
 */
export const wordPartColors = {
  prefix: '#2563eb',
  root: '#1e293b',
  suffix: '#059669',
};
