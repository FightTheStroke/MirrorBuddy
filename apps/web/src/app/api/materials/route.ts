/**
 * API Route: Materials
 * Persists tool outputs (mindmaps, quizzes, flashcards, etc.) to database.
 * Part of T-20: Persist tools to database + API.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateSearchableText } from "@/lib/search/searchable-text";
import type { ToolType } from "@/types/tools";
import { CreateMaterialRequest, UpdateMaterialRequest } from "./types";
import { VALID_MATERIAL_TYPES } from "./constants";
import {
  getMaterialsList,
  buildUpdateData,
  updateMaterialTags,
} from "./helpers";

/**
 * GET /api/materials
 * List materials for current user with optional filters
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/materials"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const result = await getMaterialsList(userId, {
    toolType: searchParams.get("toolType") || undefined,
    status: searchParams.get("status") || "active",
    limit: parseInt(searchParams.get("limit") || "50", 10),
    offset: parseInt(searchParams.get("offset") || "0", 10),
    collectionId: searchParams.get("collectionId") || undefined,
    tagId: searchParams.get("tagId") || undefined,
    search: searchParams.get("search") || undefined,
    subject: searchParams.get("subject") || undefined,
  });

  return NextResponse.json(result);
});

/**
 * POST /api/materials
 * Create a new material (persist tool output)
 */
export const POST = pipe(
  withSentry("/api/materials"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body: CreateMaterialRequest = await ctx.req.json();
  const {
    toolId,
    toolType,
    title,
    content,
    maestroId,
    sessionId,
    subject,
    preview,
    collectionId,
    tagIds,
  } = body;

  if (!toolId || !toolType || !title || !content) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        required: ["toolId", "toolType", "title", "content"],
      },
      { status: 400 },
    );
  }

  if (!VALID_MATERIAL_TYPES.includes(toolType)) {
    return NextResponse.json(
      {
        error: "Invalid tool type",
        validTypes: VALID_MATERIAL_TYPES,
      },
      { status: 400 },
    );
  }

  const existing = await prisma.material.findUnique({
    where: { toolId },
  });

  const searchableText = generateSearchableText(toolType as ToolType, content);

  if (existing) {
    const updated = await prisma.material.update({
      where: { toolId },
      data: {
        title,
        content: JSON.stringify(content),
        searchableText,
        preview,
        updatedAt: new Date(),
      },
    });

    logger.info("Material updated", { toolId, toolType });

    return NextResponse.json({
      success: true,
      material: {
        ...updated,
        content,
      },
      updated: true,
    });
  }

  const material = await prisma.material.create({
    data: {
      userId,
      toolId,
      toolType,
      title,
      content: JSON.stringify(content),
      searchableText,
      maestroId,
      sessionId,
      subject,
      preview,
      collectionId,
      ...(tagIds &&
        tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
    },
    include: {
      collection: { select: { id: true, name: true, color: true } },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  logger.info("Material created", {
    toolId,
    toolType,
    userId,
    collectionId,
    tagCount: tagIds?.length,
  });

  return NextResponse.json({
    success: true,
    material: {
      ...material,
      content,
      tags: material.tags.map((mt) => mt.tag),
    },
    created: true,
  });
});

/**
 * PATCH /api/materials
 * Update a material (title, content, or status)
 */
export const PATCH = pipe(
  withSentry("/api/materials"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body: UpdateMaterialRequest & { toolId: string } = await ctx.req.json();
  const {
    toolId,
    title,
    content,
    status,
    userRating,
    isBookmarked,
    collectionId,
    tagIds,
  } = body;

  if (!toolId) {
    return NextResponse.json({ error: "Missing toolId" }, { status: 400 });
  }

  const existing = await prisma.material.findUnique({
    where: { toolId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const updateData = buildUpdateData(existing, {
    title,
    content,
    status,
    userRating,
    isBookmarked,
    collectionId,
  });
  await updateMaterialTags(existing.id, tagIds);

  const updated = await prisma.material.update({
    where: { toolId },
    data: updateData,
    include: {
      collection: { select: { id: true, name: true, color: true } },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  logger.info("Material patched", {
    toolId,
    fields: Object.keys(updateData),
    tagCount: tagIds?.length,
  });

  return NextResponse.json({
    success: true,
    material: {
      ...updated,
      tags: updated.tags.map((mt) => mt.tag),
      content: content || JSON.parse(updated.content),
    },
  });
});

/**
 * DELETE /api/materials
 * Soft-delete a material (sets status to 'deleted')
 */
export const DELETE = pipe(
  withSentry("/api/materials"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const toolId = searchParams.get("toolId");

  if (!toolId) {
    return NextResponse.json(
      { error: "Missing toolId parameter" },
      { status: 400 },
    );
  }

  const existing = await prisma.material.findUnique({
    where: { toolId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  await prisma.material.update({
    where: { toolId },
    data: { status: "deleted" },
  });

  logger.info("Material deleted", { toolId });

  return NextResponse.json({
    success: true,
    toolId,
  });
});
