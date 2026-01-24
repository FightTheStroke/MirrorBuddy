import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { subscriptionTelemetry } from "@/lib/analytics/subscription-telemetry";

/**
 * GET /api/admin/subscriptions/[id]
 * Get a single subscription by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: subscriptionId } = await params;

    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tier: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return NextResponse.json(
      { error: "Failed to retrieve subscription" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/subscriptions/[id]
 * Update subscription (status, expiresAt, overrideLimits, overrideFeatures)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id: subscriptionId } = await params;

    // Validate that at least one field is being updated
    const { status, expiresAt, overrideLimits, overrideFeatures, notes } = body;

    if (!status && !expiresAt && !overrideLimits && !overrideFeatures) {
      return NextResponse.json(
        { error: "No fields to update provided" },
        { status: 400 },
      );
    }

    // Check if subscription exists
    const existingSubscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (overrideLimits !== undefined)
      updateData.overrideLimits = overrideLimits;
    if (overrideFeatures !== undefined)
      updateData.overrideFeatures = overrideFeatures;

    // Update subscription
    const updatedSubscription = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        tier: true,
      },
    });

    // Create audit log entry
    await prisma.tierAuditLog.create({
      data: {
        userId: existingSubscription.userId,
        adminId: auth.userId || "unknown",
        action: "SUBSCRIPTION_UPDATE",
        changes: {
          fields: Object.keys(updateData),
          ...(status !== undefined && {
            status: {
              from: existingSubscription.status,
              to: status,
            },
          }),
          ...(expiresAt !== undefined && {
            expiresAt: {
              from: existingSubscription.expiresAt?.toISOString() || null,
              to: expiresAt ? new Date(expiresAt).toISOString() : null,
            },
          }),
        },
        notes: notes || null,
      },
    });

    // Emit telemetry events for status changes
    if (status === "CANCELLED" && existingSubscription.status !== "CANCELLED") {
      subscriptionTelemetry.track({
        type: "subscription.cancelled",
        userId: existingSubscription.userId,
        tierId: updatedSubscription.tierId,
        previousTierId: null,
        timestamp: new Date(),
        metadata: {
          subscriptionId: subscriptionId,
          previousStatus: existingSubscription.status,
          reason: notes || "admin_action",
        },
      });
    }

    if (status === "EXPIRED" && existingSubscription.status !== "EXPIRED") {
      subscriptionTelemetry.track({
        type: "subscription.expired",
        userId: existingSubscription.userId,
        tierId: updatedSubscription.tierId,
        previousTierId: null,
        timestamp: new Date(),
        metadata: {
          subscriptionId: subscriptionId,
          previousStatus: existingSubscription.status,
          reason: notes || "manual_expiration",
        },
      });
    }

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/subscriptions/[id]
 * Delete a subscription
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: subscriptionId } = await params;

    // Check if subscription exists
    const existingSubscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Delete subscription
    await prisma.userSubscription.delete({
      where: { id: subscriptionId },
    });

    // Create audit log entry
    await prisma.tierAuditLog.create({
      data: {
        userId: existingSubscription.userId,
        adminId: auth.userId || "unknown",
        action: "SUBSCRIPTION_DELETE",
        changes: {
          id: subscriptionId,
          tierId: existingSubscription.tierId,
          status: existingSubscription.status,
        },
      },
    });

    // Emit telemetry event for subscription deletion
    subscriptionTelemetry.track({
      type: "subscription.cancelled",
      userId: existingSubscription.userId,
      tierId: existingSubscription.tierId,
      previousTierId: null,
      timestamp: new Date(),
      metadata: {
        subscriptionId: subscriptionId,
        status: existingSubscription.status,
        reason: "admin_deletion",
      },
    });

    return NextResponse.json({ success: true, id: subscriptionId });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
