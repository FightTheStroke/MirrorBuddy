// ============================================================================
// VALIDATION: Middleware and helpers for API routes
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  error: string;
  details: ValidationError[];
}

// ============================================================================
// Error formatting
// ============================================================================

/**
 * Format Zod validation errors into a structured response
 */
export function formatValidationErrors(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  error: ZodError,
  message = 'Invalid request data'
): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      details: formatValidationErrors(error),
    },
    { status: 400 }
  );
}

// ============================================================================
// Validation helpers
// ============================================================================

/**
 * Validate request body against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Request body data
 * @returns Validation result
 */
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Validate and parse JSON request body
 * @param request NextRequest
 * @param schema Zod schema to validate against
 * @returns Parsed and validated data or error response
 */
export async function validateJsonRequest<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ValidationErrorResponse> }
> {
  try {
    const body = await request.json();
    const validation = validateRequest(schema, body);

    if (!validation.success) {
      return {
        success: false,
        response: createValidationErrorResponse(validation.error),
      };
    }

    return { success: true, data: validation.data };
  } catch (_error) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid JSON',
          details: [
            {
              field: 'body',
              message: 'Request body must be valid JSON',
            },
          ],
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate route parameters
 * @param params Route parameters
 * @param schema Zod schema to validate against
 * @returns Validation result
 */
export function validateParams<T extends z.ZodTypeAny>(
  params: unknown,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  return validateRequest(schema, params);
}

/**
 * Validate query parameters
 * @param searchParams URL search params
 * @param schema Zod schema to validate against
 * @returns Validation result
 */
export function validateQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  const params = Object.fromEntries(searchParams.entries());
  return validateRequest(schema, params);
}
