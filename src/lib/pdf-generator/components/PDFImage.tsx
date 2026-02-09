"use client";

/**
 * PDFImage Component
 * Accessible image component with ALT text for PDF generation
 */

import React from 'react';
import { View, Image, Text, StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig } from '../types';
import { mergeStyles, toReactPdfStyle, type StyleInput } from '../utils/style-utils';
import { useTranslations } from "next-intl";

interface PDFImageProps {
  src: string;
  alt: string;
  caption?: string;
  profile: ProfileConfig;
  width?: number | string;
  height?: number | string;
  style?: StyleInput;
}

/**
 * Create image styles based on profile
 */
function createImageStyles(profile: ProfileConfig) {
  return StyleSheet.create({
    container: {
      marginVertical: 16,
      alignItems: 'center',
    },
    image: {
      maxWidth: '100%',
      objectFit: 'contain',
    },
    altTextContainer: {
      marginTop: 8,
      padding: 8,
      backgroundColor: '#f1f5f9',
      borderRadius: 4,
      width: '100%',
    },
    altText: {
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize * 0.85,
      color: '#475569',
      fontStyle: 'italic',
    },
    altLabel: {
      fontSize: profile.fontSize * 0.75,
      color: '#94a3b8',
      marginBottom: 4,
    },
    caption: {
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize * 0.9,
      color: '#64748b',
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    // ADHD: simplified image container
    adhdContainer: {
      marginVertical: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      alignItems: 'center',
    },
    // Dyslexia: high contrast border
    dyslexiaContainer: {
      marginVertical: 16,
      padding: 8,
      borderWidth: 2,
      borderColor: '#3b82f6',
      borderRadius: 4,
      backgroundColor: '#ffffff',
      alignItems: 'center',
    },
  });
}

/**
 * Check if the source is a valid URL or base64 image
 */
function isValidImageSource(src: string): boolean {
  if (!src) return false;

  // Check for base64
  if (src.startsWith('data:image/')) return true;

  // Check for http/https URL
  if (src.startsWith('http://') || src.startsWith('https://')) return true;

  // Check for local file path
  if (src.startsWith('/') || src.startsWith('./')) return true;

  return false;
}

/**
 * PDFImage - Renders accessible images with ALT text
 * Always includes ALT text description for accessibility
 */
export function PDFImage({
  src,
  alt,
  caption,
  profile,
  width,
  height,
  style,
}: PDFImageProps) {
  const t = useTranslations("tools");
  const styles = createImageStyles(profile);

  // Determine container style based on profile
  let containerStyle = styles.container;
  if (profile.options.distractionFree) {
    containerStyle = styles.adhdContainer;
  } else if (profile.options.dyslexiaFont || profile.options.extraSpacing) {
    containerStyle = styles.dyslexiaContainer;
  }

  // Check if we have a valid image source
  const hasValidSource = isValidImageSource(src);

  // Build image style array
  const imageStyleArray: object[] = [styles.image];
  if (width) imageStyleArray.push({ width });
  if (height) imageStyleArray.push({ height });
  const imageStyle = toReactPdfStyle(imageStyleArray);

  const viewStyle = mergeStyles(containerStyle, style);

  return (
    <View style={viewStyle}>
      {/* Image (if valid source) */}
      {hasValidSource && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={src} style={imageStyle} />
      )}

      {/* ALT text - always visible for accessibility */}
      <View style={styles.altTextContainer}>
        <Text style={styles.altLabel}>{t("descrizioneImmagine")}</Text>
        <Text style={styles.altText}>{alt}</Text>
      </View>

      {/* Optional caption */}
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}
