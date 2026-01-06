/**
 * PDFText Component
 * Accessible text component with DSA-specific formatting
 */

import React from 'react';
import { Text, View as _View, StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig } from '../types';
import { operatorColors, wordPartColors as _wordPartColors } from '../profiles';

// Use generic style type compatible with react-pdf
type PDFStyle = object | object[];

interface PDFTextProps {
  children?: React.ReactNode;
  profile: ProfileConfig;
  style?: PDFStyle;
  render?: (info: { pageNumber: number; totalPages: number }) => string;
}

/**
 * Create text styles based on profile
 */
function createTextStyles(profile: ProfileConfig) {
  return StyleSheet.create({
    text: {
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      color: profile.textColor,
      letterSpacing: profile.letterSpacing,
      marginBottom: profile.paragraphSpacing / 2,
    },
    // Stuttering: add breathing marks (visual pause indicators)
    breathingMark: {
      color: '#94a3b8',
      fontSize: profile.fontSize * 0.8,
    },
    // ADHD: highlight key terms
    keyTerm: {
      fontWeight: 'bold',
      color: '#1e40af',
    },
    // Dyscalculia: number styling
    number: {
      fontSize: profile.fontSize * 1.2,
      fontWeight: 'bold',
    },
  });
}

/**
 * Process text for stuttering profile
 * Adds breathing marks at natural pause points
 */
function processForStuttering(text: string): string {
  if (typeof text !== 'string') return text;

  // Add subtle pause markers after sentences
  return text
    .replace(/\. /g, '. [pausa] ')
    .replace(/\? /g, '? [pausa] ')
    .replace(/! /g, '! [pausa] ');
}

/**
 * Process text for ADHD profile
 * Highlights key terms (capitalized words, quoted text)
 */
function processForADHD(text: string): React.ReactNode {
  if (typeof text !== 'string') return text;

  // Split by quoted text to highlight key terms
  const parts = text.split(/(".*?")/g);

  return parts.map((part, index) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <Text key={index} style={{ fontWeight: 'bold', color: '#1e40af' }}>
          {part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
}

/**
 * Process text for dyscalculia profile
 * Color-codes mathematical operators
 */
function processForDyscalculia(text: string): React.ReactNode {
  if (typeof text !== 'string') return text;

  // Find and color-code operators
  const operatorRegex = /(\+|-|\*|\/|=|\u00d7|\u00f7)/g;

  const parts = text.split(operatorRegex);

  return parts.map((part, index) => {
    const color = getOperatorColor(part);
    if (color) {
      return (
        <Text key={index} style={{ color, fontWeight: 'bold', fontSize: 18 }}>
          {' '}{part}{' '}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
}

/**
 * Get color for mathematical operator
 */
function getOperatorColor(operator: string): string | null {
  switch (operator) {
    case '+':
      return operatorColors.plus;
    case '-':
      return operatorColors.minus;
    case '*':
    case '\u00d7': // multiplication sign
      return operatorColors.multiply;
    case '/':
    case '\u00f7': // division sign
      return operatorColors.divide;
    case '=':
      return operatorColors.equals;
    default:
      return null;
  }
}

/**
 * Process text for dysorthography profile
 * Underlines common spelling patterns
 */
function processForDysorthography(text: string): React.ReactNode {
  if (typeof text !== 'string') return text;

  // Common Italian spelling patterns to highlight
  const _patterns = [
    /\b(gli|gn|sc|ch|gh)\w*/gi,
  ];

  // For now, return text as-is (pattern highlighting would need more complex rendering)
  return text;
}

/**
 * PDFText - Renders accessible text with profile-specific formatting
 */
export function PDFText({ children, profile, style, render }: PDFTextProps) {
  const styles = createTextStyles(profile);

  // Handle render function for page numbers
  if (render) {
    const textStyle = style ? [styles.text, style] : styles.text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Text style={textStyle as any} render={render} />;
  }

  // Get processed content based on profile
  let content: React.ReactNode = children;

  if (typeof children === 'string') {
    if (profile.options.breathingMarks) {
      content = processForStuttering(children);
    } else if (profile.options.highlightKeyTerms) {
      content = processForADHD(children);
    } else if (profile.options.coloredOperators) {
      content = processForDyscalculia(children);
    } else if (profile.options.underlinePatterns) {
      content = processForDysorthography(children);
    }
  }

  // Stuttering profile: add visual cues
  if (profile.options.breathingMarks && typeof content === 'string') {
    const parts = content.split('[pausa]');
    const stutterStyle = style ? [styles.text, style] : styles.text;
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Text style={stutterStyle as any}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <Text style={styles.breathingMark}> ~ </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  }

  const finalStyle = style ? [styles.text, style] : styles.text;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Text style={finalStyle as any}>{content}</Text>;
}
