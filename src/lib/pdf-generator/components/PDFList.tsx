/**
 * PDFList Component
 * Accessible list component for PDF generation
 */

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig } from '../types';
import { PDFText } from './PDFText';
import { mergeStyles, toReactPdfStyle, type StyleInput } from '../utils/style-utils';

interface PDFListProps {
  items: string[];
  profile: ProfileConfig;
  ordered?: boolean;
  style?: StyleInput;
}

/**
 * Create list styles based on profile
 */
function createListStyles(profile: ProfileConfig) {
  return StyleSheet.create({
    list: {
      marginLeft: 16,
      marginBottom: profile.paragraphSpacing,
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: profile.paragraphSpacing / 3,
    },
    bullet: {
      width: 20,
      fontSize: profile.fontSize,
      color: profile.textColor,
    },
    // Dyslexia: larger, more visible bullets
    largeBullet: {
      width: 24,
      fontSize: profile.fontSize * 1.2,
      color: '#3b82f6',
    },
    // ADHD: numbered items with clear visual separation
    adhdNumber: {
      width: 28,
      fontSize: profile.fontSize,
      fontWeight: 'bold',
      color: '#1e40af',
      backgroundColor: '#dbeafe',
      borderRadius: 4,
      textAlign: 'center',
      marginRight: 8,
    },
    itemContent: {
      flex: 1,
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      color: profile.textColor,
      letterSpacing: profile.letterSpacing,
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
