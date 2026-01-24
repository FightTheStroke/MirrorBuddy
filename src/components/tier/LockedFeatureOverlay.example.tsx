/**
 * MIRRORBUDDY - LockedFeatureOverlay Usage Examples
 *
 * This file demonstrates how to use the LockedFeatureOverlay component
 * to restrict access to Pro-only features based on user tier.
 *
 * Usage patterns for webcam and other Pro-only features.
 */

import { LockedFeatureOverlay } from "./LockedFeatureOverlay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import type { TierName } from "@/types/tier-types";

/**
 * Example: Wrapped Webcam Feature Button
 *
 * Shows how to wrap a simple button with the LockedFeatureOverlay
 * to prevent non-Pro users from accessing the webcam feature.
 */
export function WebcamFeatureButtonExample({
  userTier,
}: {
  userTier: TierName;
}) {
  return (
    <LockedFeatureOverlay tier={userTier} feature="webcam">
      <Button className="w-full gap-2" variant="outline">
        <Video className="w-4 h-4" />
        Open Webcam
      </Button>
    </LockedFeatureOverlay>
  );
}

/**
 * Example: Wrapped Webcam Feature Card
 *
 * Shows how to wrap a card containing webcam controls.
 */
export function WebcamFeatureCardExample({ userTier }: { userTier: TierName }) {
  return (
    <LockedFeatureOverlay tier={userTier} feature="webcam">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="font-semibold text-lg">Webcam Capture</h3>
            <p className="text-sm text-slate-500">
              Take photos with your camera for homework and assignments
            </p>
          </div>
        </div>
        <Button className="w-full" variant="outline">
          Open Camera
        </Button>
      </Card>
    </LockedFeatureOverlay>
  );
}

/**
 * Example: Feature Preview Panel with Multiple Tools
 *
 * Shows how to use LockedFeatureOverlay for one of many tools
 * in a feature grid.
 */
export function ToolGridWithLockedFeatureExample({
  userTier,
}: {
  userTier: TierName;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Unlocked feature - no overlay needed */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">PDF Upload</h3>
        <p className="text-sm text-slate-500 mb-3">Available on all tiers</p>
        <Button variant="outline" className="w-full">
          Upload PDF
        </Button>
      </Card>

      {/* Locked feature - wrapped with overlay */}
      <LockedFeatureOverlay tier={userTier} feature="webcam">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Webcam Capture</h3>
          <p className="text-sm text-slate-500 mb-3">
            Capture images with your camera
          </p>
          <Button variant="outline" className="w-full">
            Open Camera
          </Button>
        </Card>
      </LockedFeatureOverlay>

      {/* Another locked feature example */}
      <LockedFeatureOverlay tier={userTier} feature="parent_dashboard">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Parent Dashboard</h3>
          <p className="text-sm text-slate-500 mb-3">
            Monitor student progress
          </p>
          <Button variant="outline" className="w-full">
            View Dashboard
          </Button>
        </Card>
      </LockedFeatureOverlay>
    </div>
  );
}

/**
 * Example: Usage in Chat Feature
 *
 * Shows how to conditionally render a "Take Photo" button in the chat
 * interface with the LockedFeatureOverlay.
 */
export function ChatFeatureButtonsExample({
  userTier,
}: {
  userTier: TierName;
}) {
  return (
    <div className="flex gap-2">
      {/* Standard features available to all tiers */}
      <Button variant="ghost" size="sm">
        Attach File
      </Button>

      {/* Pro-only feature wrapped with overlay */}
      <LockedFeatureOverlay tier={userTier} feature="webcam">
        <Button variant="ghost" size="sm" className="gap-1">
          <Video className="w-4 h-4" />
          Take Photo
        </Button>
      </LockedFeatureOverlay>
    </div>
  );
}

/**
 * INTEGRATION PATTERNS:
 *
 * 1. Button wrapper (simplest):
 *    <LockedFeatureOverlay tier={userTier} feature="webcam">
 *      <Button>Take Photo</Button>
 *    </LockedFeatureOverlay>
 *
 * 2. Card wrapper (for feature cards):
 *    <LockedFeatureOverlay tier={userTier} feature="webcam">
 *      <Card>...</Card>
 *    </LockedFeatureOverlay>
 *
 * 3. With callback (for handling upgrades):
 *    <LockedFeatureOverlay
 *      tier={userTier}
 *      feature="webcam"
 *      onUpgrade={() => showUpgradeModal()}
 *    >
 *      <Button>Take Photo</Button>
 *    </LockedFeatureOverlay>
 *
 * BEST PRACTICES:
 *
 * - Always provide meaningful content inside the overlay (the feature users can't access)
 * - Use consistent feature keys from FeatureKey type
 * - Pair with user tier from UserSubscription.tier
 * - Consider layout size - overlay scales to fit content
 * - For modals, handle the isOpen state separately (overlay doesn't manage modal state)
 *
 * TESTING:
 *
 * When testing components with LockedFeatureOverlay:
 * - Test with tier="pro" to verify children render normally
 * - Test with tier="trial"/"base" to verify overlay appears
 * - Use data-testid to find overlay: document.querySelector('[data-testid="locked-overlay"]')
 * - Verify Pro badge displays: screen.getByText('Pro')
 * - Check upgrade button exists: screen.getByRole('button', { name: /upgrade/i })
 */
