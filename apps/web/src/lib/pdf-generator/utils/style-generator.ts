/**
 * Style Generator
 * Generates PDF styles from DSA profile configuration
 */

import { StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig, PDFStyles } from '../types';
import { sanitizeNumber } from './style-utils';

/**
 * Generate complete PDF styles from a profile configuration
 * Uses sanitizeNumber to prevent PDF rendering errors
 */
export function generateStyles(
  profile: ProfileConfig,
  format: 'A4' | 'Letter' = 'A4'
): PDFStyles {
  const fontSize = sanitizeNumber(profile.fontSize, 14);
  const headingScale = sanitizeNumber(profile.headingScale, 1.3);
  const paragraphSpacing = sanitizeNumber(profile.paragraphSpacing, 20);
  const lineHeight = sanitizeNumber(profile.lineHeight, 1.5);
  const letterSpacing = sanitizeNumber(profile.letterSpacing, 0);
  const wordSpacing = sanitizeNumber(profile.wordSpacing, 0);

  return {
    page: {
      size: format === 'Letter' ? 'LETTER' : 'A4',
      orientation: 'portrait',
      backgroundColor: profile.backgroundColor || '#ffffff',
      padding: calculatePadding(profile),
    },
    header: {
      fontSize: sanitizeNumber(fontSize * headingScale, 18),
      color: profile.textColor || '#1e293b',
      borderBottom: true,
      marginBottom: paragraphSpacing,
    },
    content: {
      fontFamily: profile.fontFamily || 'Helvetica',
      fontSize,
      lineHeight,
      color: profile.textColor || '#1e293b',
      letterSpacing,
      wordSpacing,
    },
    footer: {
      fontSize: 10,
      color: '#64748b',
      showPageNumbers: true,
      showDate: true,
    },
  };
}

/**
 * Calculate appropriate padding based on profile
 */
function calculatePadding(profile: ProfileConfig): number {
  // More padding for profiles that need breathing room
  if (profile.options.distractionFree) return 50;
  if (profile.options.extraSpacing) return 45;
  if (profile.options.chunkedText) return 45;
  return 40;
}

/**
 * Create react-pdf StyleSheet from profile
 * Uses sanitizeNumber to prevent PDF rendering errors
 */
export function createProfileStyleSheet(profile: ProfileConfig) {
  const fontSize = sanitizeNumber(profile.fontSize, 14);
  const headingScale = sanitizeNumber(profile.headingScale, 1.3);
  const paragraphSpacing = sanitizeNumber(profile.paragraphSpacing, 20);
  const lineHeight = sanitizeNumber(profile.lineHeight, 1.5);
  const letterSpacing = sanitizeNumber(profile.letterSpacing, 0);
  const textColor = profile.textColor || '#1e293b';
  const fontFamily = profile.fontFamily || 'Helvetica';
  const backgroundColor = profile.backgroundColor || '#ffffff';

  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor,
      padding: calculatePadding(profile),
      fontFamily,
      fontSize,
      lineHeight,
      color: textColor,
    },
    header: {
      marginBottom: paragraphSpacing,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      borderBottomStyle: 'solid',
    },
    title: {
      fontSize: sanitizeNumber(fontSize * headingScale * 1.4, 25),
      fontWeight: 'bold',
      color: textColor,
      marginBottom: 8,
      letterSpacing,
    },
    h2: {
      fontSize: sanitizeNumber(fontSize * headingScale * 1.2, 22),
      fontWeight: 'bold',
      color: textColor,
      marginTop: 16,
      marginBottom: 12,
      letterSpacing,
    },
    h3: {
      fontSize: sanitizeNumber(fontSize * headingScale, 18),
      fontWeight: 'bold',
      color: textColor,
      marginTop: 12,
      marginBottom: 8,
      letterSpacing,
    },
    paragraph: {
      fontFamily,
      fontSize,
      lineHeight,
      color: textColor,
      letterSpacing,
      marginBottom: sanitizeNumber(paragraphSpacing / 2, 10),
      textAlign: 'justify',
    },
    list: {
      marginLeft: 16,
      marginBottom: sanitizeNumber(paragraphSpacing / 2, 10),
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: sanitizeNumber(paragraphSpacing / 4, 5),
    },
    bullet: {
      width: 20,
      fontSize,
      color: profile.options.dyslexiaFont ? '#3b82f6' : textColor,
    },
    quote: {
      borderLeftWidth: 3,
      borderLeftColor: '#3b82f6',
      borderLeftStyle: 'solid',
      paddingLeft: 12,
      marginVertical: 12,
      fontStyle: 'italic',
      color: '#475569',
    },
    image: {
      marginVertical: 16,
      alignSelf: 'center',
      maxWidth: '90%',
    },
    imageCaption: {
      fontSize: sanitizeNumber(fontSize * 0.85, 12),
      color: '#64748b',
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    altText: {
      fontSize: sanitizeNumber(fontSize * 0.8, 11),
      color: '#475569',
      backgroundColor: '#f1f5f9',
      padding: 8,
      marginTop: 4,
      borderRadius: 4,
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      fontSize: 10,
      color: '#94a3b8',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    pageNumber: {
      textAlign: 'right',
    },
    // Profile-specific styles
    adhdSection: {
      marginBottom: sanitizeNumber(paragraphSpacing * 1.5, 30),
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      borderBottomStyle: 'dashed',
    },
    dyslexiaHighlight: {
      backgroundColor: '#fef3c7',
      padding: 2,
      borderRadius: 2,
    },
    dyscalculiaNumber: {
      fontSize: sanitizeNumber(fontSize * 1.3, 18),
      fontWeight: 'bold',
      color: '#1e40af',
    },
    breathingMark: {
      color: '#94a3b8',
      fontSize: sanitizeNumber(fontSize * 0.75, 11),
    },
  });
}

/**
 * Get color scheme based on profile
 */
export function getColorScheme(profile: ProfileConfig) {
  return {
    primary: profile.textColor,
    background: profile.backgroundColor,
    accent: getAccentColor(profile),
    muted: '#64748b',
    border: '#e2e8f0',
    highlight: getHighlightColor(profile),
  };
}

/**
 * Get accent color based on profile
 */
function getAccentColor(profile: ProfileConfig): string {
  switch (profile.name) {
    case 'dyslexia':
      return '#3b82f6'; // Blue
    case 'dyscalculia':
      return '#059669'; // Green
    case 'adhd':
      return '#7c3aed'; // Purple
    case 'dyspraxia':
      return '#f59e0b'; // Amber
    default:
      return '#3b82f6'; // Default blue
  }
}

/**
 * Get highlight color based on profile
 */
function getHighlightColor(profile: ProfileConfig): string {
  switch (profile.name) {
    case 'dyslexia':
      return '#fef3c7'; // Light yellow
    case 'dyscalculia':
      return '#d1fae5'; // Light green
    case 'adhd':
      return '#dbeafe'; // Light blue
    case 'dyspraxia':
      return '#fef9c3'; // Light amber
    default:
      return '#f1f5f9'; // Light gray
  }
}
