/**
 * PDFText Component
 * Accessible text component with DSA-specific formatting
 */

import React from 'react';
import { Text, View as _View, StyleSheet } from '@react-pdf/renderer';
import type { ProfileConfig } from '../types';
import { operatorColors, wordPartColors as _wordPartColors } from '../profiles';
import { mergeStyles, sanitizeNumber, type StyleInput } from '../utils/style-utils';

interface PDFTextProps {
  children?: React.ReactNode;
  profile: ProfileConfig;
  style?: StyleInput;
  render?: (info: { pageNumber: number; totalPages: number }) => string;
}

/**
 * Create text styles based on profile
 * Uses sanitizeNumber to prevent PDF rendering errors
 */
function createTextStyles(profile: ProfileConfig) {
  const fontSize = sanitizeNumber(profile.fontSize, 14);
  const lineHeight = sanitizeNumber(profile.lineHeight, 1.5);
  const letterSpacing = sanitizeNumber(profile.letterSpacing, 0);
  const paragraphSpacing = sanitizeNumber(profile.paragraphSpacing, 20);

  return StyleSheet.create({
    text: {
      fontFamily: profile.fontFamily || 'Helvetica',
      fontSize,
      lineHeight,
      color: profile.textColor || '#1e293b',
      letterSpacing,
      marginBottom: sanitizeNumber(paragraphSpacing / 2, 10),
    },
    // Stuttering: add breathing marks (visual pause indicators)
    breathingMark: {
      color: '#94a3b8',
      fontSize: sanitizeNumber(fontSize * 0.8, 11),
    },
    // ADHD: highlight key terms
    keyTerm: {
      fontWeight: 'bold',
      color: '#1e40af',
    },
    // Dyscalculia: number styling
    number: {
      fontSize: sanitizeNumber(fontSize * 1.2, 17),
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
  const textStyle = mergeStyles(styles.text, style);

  // Handle render function for page numbers
  if (render) {
    return <Text style={textStyle} render={render} />;
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
    return (
      <Text style={textStyle}>
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

  return <Text style={textStyle}>{content}</Text>;
}
