/**
 * PDFDocument Component
 * Main document wrapper for accessible PDF generation
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { ProfileConfig, ExtractedContent } from '../types';
import { PDFTitle } from './PDFTitle';
import { PDFText } from './PDFText';
import { PDFList } from './PDFList';
import { PDFImage } from './PDFImage';

// Register default fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
  ],
});

interface PDFDocumentProps {
  content: ExtractedContent;
  profile: ProfileConfig;
  format?: 'A4' | 'Letter';
}

/**
 * Create dynamic styles based on profile configuration
 */
function createStyles(profile: ProfileConfig, _format: 'A4' | 'Letter') {
  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: profile.backgroundColor,
      padding: 40,
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      color: profile.textColor,
    },
    header: {
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      borderBottomStyle: 'solid',
    },
    subject: {
      fontSize: profile.fontSize * 0.8,
      color: '#64748b',
      marginBottom: 8,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: profile.paragraphSpacing,
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
    readingInfo: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 8,
    },
  });
}

/**
 * Main PDF Document component
 */
export function PDFDocumentComponent({
  content,
  profile,
  format = 'A4',
}: PDFDocumentProps) {
  const styles = createStyles(profile, format);
  const pageSize = format === 'A4' ? 'A4' : 'LETTER';

  return (
    <Document
      title={content.title}
      author="MirrorBuddy"
      subject={content.subject || 'Studio Kit'}
      keywords="accessible, DSA, education"
      creator="MirrorBuddy PDF Generator"
      producer="@react-pdf/renderer"
    >
      <Page size={pageSize} style={styles.page} wrap>
        {/* Header with title */}
        <View style={styles.header}>
          {content.subject && (
            <PDFText style={styles.subject} profile={profile}>
              {content.subject}
            </PDFText>
          )}
          <PDFTitle level={1} profile={profile}>
            {content.title}
          </PDFTitle>
          {profile.options.readingTimeEstimate && (
            <PDFText style={styles.readingInfo} profile={profile}>
              Tempo di lettura stimato: {content.metadata.readingTime} minuti
            </PDFText>
          )}
        </View>

        {/* Content sections */}
        <View style={styles.content}>
          {content.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              {renderSection(section, profile, index)}
            </View>
          ))}
        </View>

        {/* Footer with page numbers */}
        <View style={styles.footer} fixed>
          <PDFText profile={profile}>
            {profile.nameIt} - Generato da MirrorBuddy
          </PDFText>
          <PDFText
            style={styles.pageNumber}
            profile={profile}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} di ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Render individual content section based on type
 */
function renderSection(
  section: ExtractedContent['sections'][0],
  profile: ProfileConfig,
  index: number
) {
  switch (section.type) {
    case 'heading':
      return (
        <PDFTitle key={index} level={(section.level || 2) as 1 | 2 | 3} profile={profile}>
          {section.content}
        </PDFTitle>
      );

    case 'paragraph':
      return (
        <PDFText key={index} profile={profile}>
          {section.content}
        </PDFText>
      );

    case 'list':
      return (
        <PDFList
          key={index}
          items={section.items || section.content.split('\n')}
          profile={profile}
        />
      );

    case 'image':
      return (
        <PDFImage
          key={index}
          src={section.content}
          alt={section.metadata?.alt as string || 'Image'}
          caption={section.metadata?.caption as string}
          profile={profile}
        />
      );

    case 'quote':
      return (
        <View
          key={index}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: '#3b82f6',
            paddingLeft: 12,
            marginVertical: 12,
          }}
        >
          <PDFText profile={profile} style={{ fontStyle: 'italic' }}>
            {section.content}
          </PDFText>
        </View>
      );

    case 'formula':
      return (
        <View
          key={index}
          style={{
            backgroundColor: '#f8fafc',
            padding: 12,
            borderRadius: 4,
            marginVertical: 8,
          }}
        >
          <PDFText
            profile={profile}
            style={{ fontFamily: 'Courier', textAlign: 'center' }}
          >
            {section.content}
          </PDFText>
        </View>
      );

    default:
      return (
        <PDFText key={index} profile={profile}>
          {section.content}
        </PDFText>
      );
  }
}

export { PDFDocumentComponent as PDFDocument };
