/**
 * PDFList Component
 * Accessible list component for PDF generation
 */

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig } from '../types';
import { PDFText } from './PDFText';
import { mergeStyles, toReactPdfStyle, sanitizeNumber, type StyleInput } from '../utils/style-utils';

interface PDFListProps {
  items: string[];
  profile: ProfileConfig;
  ordered?: boolean;
  style?: StyleInput;
}

/**
 * Create list styles based on profile
 * Uses sanitizeNumber to prevent PDF rendering errors
 */
function createListStyles(profile: ProfileConfig) {
  const fontSize = sanitizeNumber(profile.fontSize, 14);
  const lineHeight = sanitizeNumber(profile.lineHeight, 1.5);
  const letterSpacing = sanitizeNumber(profile.letterSpacing, 0);
  const paragraphSpacing = sanitizeNumber(profile.paragraphSpacing, 20);

  return StyleSheet.create({
    list: {
      marginLeft: 16,
      marginBottom: paragraphSpacing,
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: sanitizeNumber(paragraphSpacing / 3, 7),
    },
    bullet: {
      width: 20,
      fontSize,
      color: profile.textColor || '#1e293b',
    },
    // Dyslexia: larger, more visible bullets
    largeBullet: {
      width: 24,
      fontSize: sanitizeNumber(fontSize * 1.2, 17),
      color: '#3b82f6',
    },
    // ADHD: numbered items with clear visual separation
    adhdNumber: {
      width: 28,
      fontSize,
      fontWeight: 'bold',
      color: '#1e40af',
      backgroundColor: '#dbeafe',
      borderRadius: 4,
      textAlign: 'center',
      marginRight: 8,
    },
    itemContent: {
      flex: 1,
      fontFamily: profile.fontFamily || 'Helvetica',
      fontSize,
      lineHeight,
      color: profile.textColor || '#1e293b',
      letterSpacing,
    },
    // Dyspraxia: chunked items with visual breaks
    dyspraxiaItem: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fefce8',
      borderRadius: 4,
      marginBottom: 4,
    },
  });
}

/**
 * Get bullet character based on profile
 */
function getBullet(profile: ProfileConfig, _index: number): string {
  if (profile.options.bulletPoints) {
    return '\u2022'; // Standard bullet
  }

  if (profile.options.dyslexiaFont || profile.options.extraSpacing) {
    return '\u25CF'; // Filled circle (more visible)
  }

  return '\u2022'; // Default bullet
}

/**
 * PDFList - Renders accessible lists with profile-specific styling
 */
export function PDFList({
  items,
  profile,
  ordered = false,
  style,
}: PDFListProps) {
  const styles = createListStyles(profile);

  // Filter out empty items
  const validItems = items.filter((item) => item && item.trim());

  const listStyle = mergeStyles(styles.list, style);
  const itemStyle = profile.options.chunkedText
    ? toReactPdfStyle([styles.listItem, styles.dyspraxiaItem])
    : styles.listItem;

  return (
    <View style={listStyle}>
      {validItems.map((item, index) => (
        <View key={index} style={itemStyle}>
          {/* Bullet or number */}
          {ordered ? (
            <Text
              style={
                profile.options.clearSections
                  ? styles.adhdNumber
                  : styles.bullet
              }
            >
              {index + 1}.
            </Text>
          ) : (
            <Text
              style={
                profile.options.dyslexiaFont
                  ? styles.largeBullet
                  : styles.bullet
              }
            >
              {getBullet(profile, index)}
            </Text>
          )}

          {/* Item content */}
          <View style={{ flex: 1 }}>
            <PDFText profile={profile} style={styles.itemContent}>
              {item}
            </PDFText>
          </View>
        </View>
      ))}
    </View>
  );
}
