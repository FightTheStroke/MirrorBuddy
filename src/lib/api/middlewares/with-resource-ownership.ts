/**
 * Resource Ownership Middleware
 *
 * Validates that a resource (identified by ID from route params) belongs to
 * the authenticated user. This prevents users from accessing or modifying
 * resources owned by other users.
 *
 * @example
 * ```typescript
 * import { pipe, withAuth, withResourceOwnership } from '@/lib/api/middlewares';
 *
 * // For conversations
 * export const GET = pipe(
 *   withSentry('/api/conversations/[id]'),
 *   withAuth,
 *   withResourceOwnership('conversation', 'id'),
 * )(async (ctx) => {
 *   // ctx.resource contains the verified resource
 *   return NextResponse.json(ctx.resource);
 * });
 * ```
 */

import { NextResponse } from 'next/server';
import type { Middleware, MiddlewareContext } from '../pipe';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Resource types that support ownership validation.
 * Each must have a userId field for ownership check.
 */
type OwnedResourceType =
  | 'conversation'
  | 'material'
  | 'collection'
  | 'learningPath'
  | 'studyKit'
  | 'tag'
  | 'parentNote';

/**
 * Map resource types to their Prisma model accessors.
 */
const resourceModels = {
  conversation: prisma.conversation,
  material: prisma.material,
  collection: prisma.collection,
  learningPath: prisma.learningPath,
  studyKit: prisma.studyKit,
  tag: prisma.tag,
  parentNote: prisma.parentNote,
} as const;

type OwnedResourceModel = {
  findFirst: (query: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Extend MiddlewareContext to include the verified resource.
 */
export interface ResourceOwnershipContext<T = unknown> extends MiddlewareContext {
  resource: T;
}

/**
 * Middleware factory to verify resource ownership.
 *
 * Checks that:
 * 1. User is authenticated (userId is present in context)
 * 2. Resource exists
 * 3. Resource belongs to the authenticated user
 *
 * The verified resource is added to ctx.resource for use in the handler.
 *
 * @param resourceType - Type of resource to check
 * @param paramName - Name of the route parameter containing the resource ID (default: 'id')
 * @param options - Optional configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Standard usage with 'id' param
 * export const GET = pipe(
 *   withAuth,
 *   withResourceOwnership('conversation'),
 * )(async (ctx) => {
 *   const conversation = ctx.resource;
 *   return NextResponse.json(conversation);
 * });
 *
 * // Custom param name
 * export const GET = pipe(
 *   withAuth,
 *   withResourceOwnership('material', 'toolId'),
 * )(async (ctx) => {
 *   const material = ctx.resource;
 *   return NextResponse.json(material);
 * });
 *
 * // With custom includes
 * export const GET = pipe(
 *   withAuth,
 *   withResourceOwnership('conversation', 'id', {
 *     include: { messages: true }
 *   }),
 * )(async (ctx) => {
 *   const conversationWithMessages = ctx.resource;
 *   return NextResponse.json(conversationWithMessages);
 * });
 * ```
 */
export function withResourceOwnership<T extends OwnedResourceType>(
  resourceType: T,
  paramName = 'id',
  options?: {
    include?: Record<string, unknown>;
    select?: Record<string, unknown>;
  },
): Middleware {
  return async (ctx: MiddlewareContext, next) => {
    // Verify user is authenticated (withAuth should run before this)
    if (!ctx.userId) {
      logger.warn('withResourceOwnership called without authentication', {
        resourceType,
        url: ctx.req.url,
      });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract resource ID from params
    const params = await ctx.params;
    const resourceId = params[paramName];

    if (!resourceId || typeof resourceId !== 'string') {
      logger.warn('Resource ID not found in route params', {
        resourceType,
        paramName,
        params,
      });
      return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });
    }

    // Get the appropriate Prisma model
    const model = resourceModels[resourceType as keyof typeof resourceModels];

    try {
      // Build query with ownership check
      // For materials, the ID field is 'toolId', not 'id'
      const whereClause =
        resourceType === 'material'
          ? { toolId: resourceId, userId: ctx.userId }
          : { id: resourceId, userId: ctx.userId };

      const queryOptions = {
        where: whereClause,
        ...(options?.include && { include: options.include }),
        ...(options?.select && { select: options.select }),
      };

      const resource = await (model as unknown as OwnedResourceModel).findFirst(queryOptions);

      if (!resource) {
        logger.debug('Resource not found or unauthorized', {
          resourceType,
          resourceId: resourceId.slice(0, 8),
          userId: ctx.userId.slice(0, 8),
        });
        return NextResponse.json(
          {
            error: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`,
          },
          { status: 404 },
        );
      }

      // Add verified resource to context
      const extendedCtx = ctx as ResourceOwnershipContext;
      extendedCtx.resource = resource;

      // Continue to next middleware or handler
      return next();
    } catch (error) {
      logger.error('Resource ownership check failed', {
        resourceType,
        resourceId: resourceId.slice(0, 8),
        error: String(error),
      });
      return NextResponse.json({ error: 'Failed to verify resource ownership' }, { status: 500 });
    }
  };
}

/**
 * Helper to verify ownership without middleware (for complex cases).
 * Use this when you need ownership check but can't use the middleware
 * (e.g., in functions called by multiple routes).
 *
 * @example
 * ```typescript
 * const material = await verifyResourceOwnership(
 *   'material',
 *   toolId,
 *   userId,
 *   { include: { tags: true } }
 * );
 *
 * if (!material) {
 *   return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * }
 * ```
 */
export async function verifyResourceOwnership<T extends OwnedResourceType>(
  resourceType: T,
  resourceId: string,
  userId: string,
  options?: {
    include?: Record<string, unknown>;
    select?: Record<string, unknown>;
  },
): Promise<unknown | null> {
  const model = resourceModels[resourceType as keyof typeof resourceModels];

  const whereClause =
    resourceType === 'material' ? { toolId: resourceId, userId } : { id: resourceId, userId };

  const queryOptions = {
    where: whereClause,
    ...(options?.include && { include: options.include }),
    ...(options?.select && { select: options.select }),
  };

  try {
    return await (model as unknown as OwnedResourceModel).findFirst(queryOptions);
  } catch (error) {
    logger.error('verifyResourceOwnership failed', {
      resourceType,
      resourceId: resourceId.slice(0, 8),
      error: String(error),
    });
    return null;
  }
}
