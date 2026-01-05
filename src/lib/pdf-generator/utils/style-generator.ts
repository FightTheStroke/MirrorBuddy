/**
 * Style Generator
 * Generates PDF styles from DSA profile configuration
 */

import { StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig, PDFStyles } from '../types';

/**
 * Generate complete PDF styles from a profile configuration
 */
export function generateStyles(
  profile: ProfileConfig,
  format: 'A4' | 'Letter' = 'A4'
): PDFStyles {
  return {
    page: {
      size: format === 'Letter' ? 'LETTER' : 'A4',
      orientation: 'portrait',
      backgroundColor: profile.backgroundColor,
      padding: calculatePadding(profile),
    },
    header: {
      fontSize: profile.fontSize * profile.headingScale,
      color: profile.textColor,
      borderBottom: true,
      marginBottom: profile.paragraphSpacing,
    },
    content: {
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      color: profile.textColor,
      letterSpacing: profile.letterSpacing,
      wordSpacing: profile.wordSpacing,
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
 */
export function createProfileStyleSheet(profile: ProfileConfig) {
  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: profile.backgroundColor,
      padding: calculatePadding(profile),
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      color: profile.textColor,
    },
    header: {
      marginBottom: profile.paragraphSpacing,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      borderBottomStyle: 'solid',
    },
    title: {
      fontSize: profile.fontSize * profile.headingScale * 1.4,
      fontWeight: 'bold',
      color: profile.textColor,
      marginBottom: 8,
      letterSpacing: profile.letterSpacing,
    },
    h2: {
      fontSize: profile.fontSize * profile.headingScale * 1.2,
      fontWeight: 'bold',
      color: profile.textColor,
      marginTop: 16,
      marginBottom: 12,
      letterSpacing: profile.letterSpacing,
    },
    h3: {
      fontSize: profile.fontSize * profile.headingScale,
      fontWeight: 'bold',
      color: profile.textColor,
      marginTop: 12,
      marginBottom: 8,
      letterSpacing: profile.letterSpacing,
    },
    paragraph: {
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      color: profile.textColor,
      letterSpacing: profile.letterSpacing,
      marginBottom: profile.paragraphSpacing / 2,
      textAlign: 'justify',
    },
    list: {
      marginLeft: 16,
      marginBottom: profile.paragraphSpacing / 2,
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: profile.paragraphSpacing / 4,
    },
    bullet: {
      width: 20,
      fontSize: profile.fontSize,
      color: profile.options.dyslexiaFont ? '#3b82f6' : profile.textColor,
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
      fontSize: profile.fontSize * 0.85,
      color: '#64748b',
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    altText: {
      fontSize: profile.fontSize * 0.8,
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
      marginBottom: profile.paragraphSpacing * 1.5,
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
      fontSize: profile.fontSize * 1.3,
      fontWeight: 'bold',
      color: '#1e40af',
    },
    breathingMark: {
      color: '#94a3b8',
      fontSize: profile.fontSize * 0.75,
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
