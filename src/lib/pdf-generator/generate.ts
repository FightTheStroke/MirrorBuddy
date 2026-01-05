/**
 * PDF Generation Function
 * Main function to generate accessible PDFs for DSA students
 */

import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { PDFDocument } from './components';
import { getProfile } from './profiles';
import { extractStudyKitContent } from './utils/content-extractor';
import type {
  DSAProfile,
  PDFGeneratorRequest,
  PDFGeneratorResponse,
  ExtractedContent,
} from './types';
import React, { type ReactElement } from 'react';

/**
 * Generate an accessible PDF from a Study Kit
 *
 * @param request - PDF generation request with kitId, profile, etc.
 * @returns Promise with PDF buffer and metadata
 */
export async function generateAccessiblePDF(
  request: PDFGeneratorRequest
): Promise<{ buffer: Buffer; filename: string; size: number }> {
  const { kitId, materialId, profile: profileType, format = 'A4' } = request;

  // Get profile configuration
  const profile = getProfile(profileType);

  if (!profile) {
    throw new Error(`Unknown DSA profile: ${profileType}`);
  }

  // Extract content from Study Kit
  const content = await extractStudyKitContent(kitId, materialId);

  // Generate PDF buffer
  const pdfElement = React.createElement(PDFDocument, {
    content,
    profile,
    format,
  });
  const buffer = await renderToBuffer(
    pdfElement as unknown as ReactElement<DocumentProps>
  );

  // Generate filename
  const sanitizedTitle = content.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  const filename = `${sanitizedTitle}_DSA_${profile.nameIt}.pdf`;

  return {
    buffer: Buffer.from(buffer),
    filename,
    size: buffer.byteLength,
  };
}

/**
 * Generate PDF from pre-extracted content
 * Useful when content is already available
 */
export async function generatePDFFromContent(
  content: ExtractedContent,
  profileType: DSAProfile,
  format: 'A4' | 'Letter' = 'A4'
): Promise<{ buffer: Buffer; filename: string; size: number }> {
  const profile = getProfile(profileType);

  if (!profile) {
    throw new Error(`Unknown DSA profile: ${profileType}`);
  }

  const pdfElement = React.createElement(PDFDocument, {
    content,
    profile,
    format,
  });
  const buffer = await renderToBuffer(
    pdfElement as unknown as ReactElement<DocumentProps>
  );

  const sanitizedTitle = content.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  const filename = `${sanitizedTitle}_DSA_${profile.nameIt}.pdf`;

  return {
    buffer: Buffer.from(buffer),
    filename,
    size: buffer.byteLength,
  };
}

/**
 * Validate DSA profile type
 */
export function isValidProfile(profile: string): profile is DSAProfile {
  const validProfiles: DSAProfile[] = [
    'dyslexia',
    'dyscalculia',
    'dysgraphia',
    'dysorthography',
    'adhd',
    'dyspraxia',
    'stuttering',
  ];
  return validProfiles.includes(profile as DSAProfile);
}

/**
 * Get available DSA profiles for UI display
 */
export function getAvailableProfiles(): Array<{
  value: DSAProfile;
  label: string;
  description: string;
}> {
  return [
    {
      value: 'dyslexia',
      label: 'Dislessia',
      description: 'Font grande, spaziatura aumentata, alto contrasto',
    },
    {
      value: 'dyscalculia',
      label: 'Discalculia',
      description: 'Numeri grandi, operatori colorati, griglia visiva',
    },
    {
      value: 'dysgraphia',
      label: 'Disgrafia',
      description: 'Layout strutturato, spaziatura ampia',
    },
    {
      value: 'dysorthography',
      label: 'Disortografia',
      description: 'Pattern ortografici evidenziati, sillabe colorate',
    },
    {
      value: 'adhd',
      label: 'DOP/ADHD',
      description: 'Minime distrazioni, sezioni chiare, termini evidenziati',
    },
    {
      value: 'dyspraxia',
      label: 'Disprassia',
      description: 'Testo suddiviso, tempo di lettura, pause',
    },
    {
      value: 'stuttering',
      label: 'Balbuzie',
      description: 'Frasi brevi, punti di respirazione, ritmo fluido',
    },
  ];
}
