/**
 * Webcam Plugin
 * Tool plugin for capturing and analyzing images from webcam
 * Supports both Italian and English voice triggers for accessibility
 */

import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolResult, WebcamData, ToolContext } from '@/types/tools';
import { analyzeImageWithVision } from '../handlers/webcam-handler';
import { logger } from '@/lib/logger';

/**
 * Zod schema for webcam input validation
 * Validates base64 image string
 */
const WebcamInputSchema = z.object({
  imageBase64: z.string().min(1, 'Image data is required'),
});

/**
 * Handler for webcam image capture
 * Uses Azure Vision API for OCR and image analysis
 */
async function webcamHandler(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = WebcamInputSchema.parse(args);
    const { imageBase64 } = validated;

    // Validate base64 format
    const isValidBase64 =
      imageBase64.match(/^data:image\/(jpeg|jpg|png|gif);base64,/) ||
      imageBase64.match(/^[A-Za-z0-9+/=]+$/);

    if (!isValidBase64) {
      return createErrorResult(
        'capture_webcam',
        ToolErrorCode.VALIDATION_FAILED,
        'Invalid base64 image format'
      );
    }

    logger.info('[Webcam Plugin] Starting image analysis');

    // Call Azure OpenAI Vision API
    const analysis = await analyzeImageWithVision(imageBase64);

    const data: WebcamData = {
      imageBase64,
      extractedText: analysis.text,
      imageDescription: analysis.description,
      analysisTimestamp: new Date(),
    };

    logger.info('[Webcam Plugin] Analysis complete', {
      hasText: !!analysis.text,
      hasDescription: !!analysis.description,
      textLength: analysis.text.length,
    });

    return createSuccessResult('capture_webcam', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'capture_webcam',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Webcam Plugin] Error during image analysis', { errorDetails: errorMessage });

    return createErrorResult(
      'capture_webcam',
      ToolErrorCode.EXECUTION_FAILED,
      errorMessage
    );
  }
}

/**
 * Webcam Plugin Definition
 * Implements ToolPlugin interface for image capture and analysis
 * Supports voice interaction with Italian and English triggers
 */
export const webcamPlugin: ToolPlugin = {
  // Identification
  id: 'capture_webcam',
  name: 'Scatta Foto',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: WebcamInputSchema,

  // Execution
  handler: webcamHandler,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi scattare una foto della lavagna?',
    requiresContext: [],
    fallback: 'Vuoi scattare una foto?',
  },
  voiceFeedback: {
    template: 'Ho analizzato la foto!',
    requiresContext: [],
    fallback: 'Foto catturata con successo!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'scatta foto',
    'fotografa',
    'fai una foto',
    'take photo',
    'capture',
    'foto',
    'webcam',
    'fotografia',
    'scatta',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.FILE_ACCESS, Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default webcamPlugin;
