/**
 * PDFTitle Component
 * Accessible heading component for PDF generation
 */

import React from 'react';
import { Text, StyleSheet, View } from '@react-pdf/renderer';
import type { ProfileConfig } from '../types';
import { mergeStyles, type StyleInput } from '../utils/style-utils';

interface PDFTitleProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3;
  profile: ProfileConfig;
  style?: StyleInput;
}

/**
 * Create title styles based on level and profile
 */
function createTitleStyles(level: number, profile: ProfileConfig) {
  const baseSize = profile.fontSize;
  const scale = profile.headingScale;

  const sizeMap: Record<number, number> = {
    1: baseSize * scale * 1.4,
    2: baseSize * scale * 1.2,
    3: baseSize * scale,
  };

  const marginMap: Record<number, number> = {
    1: 24,
    2: 20,
    3: 16,
  };

  return StyleSheet.create({
    title: {
      fontFamily: profile.fontFamily,
      fontSize: sizeMap[level] || sizeMap[2],
      fontWeight: 'bold',
      color: profile.textColor,
      marginBottom: marginMap[level] || marginMap[2],
      letterSpacing: profile.letterSpacing,
      lineHeight: 1.3,
    },
    // ADHD-specific: add visual separator for clear sections
    adhdSeparator: {
      height: 2,
      backgroundColor: '#e2e8f0',
      marginTop: 8,
      marginBottom: 16,
    },
    // Dyspraxia: add reading markers
    dyspraxiaMarker: {
      width: 8,
      height: 8,
      backgroundColor: '#3b82f6',
      borderRadius: 4,
      marginRight: 8,
    },
  });
}

/**
 * PDFTitle - Renders accessible headings with profile-specific styling
 */
export function PDFTitle({
  children,
  level = 2,
  profile,
  style,
}: PDFTitleProps) {
  const styles = createTitleStyles(level, profile);
  const titleStyle = mergeStyles(styles.title, style);

  // ADHD profile: add visual separators for h1 and h2
  if (profile.options.clearSections && level <= 2) {
    return (
      <View>
        <Text style={titleStyle}>{children}</Text>
        <View style={styles.adhdSeparator} />
      </View>
    );
  }

  // Dyspraxia profile: add reading markers
  if (profile.options.pauseMarkers && level === 1) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.dyspraxiaMarker} />
        <Text style={titleStyle}>{children}</Text>
      </View>
    );
  }

  return <Text style={titleStyle}>{children}</Text>;
}
