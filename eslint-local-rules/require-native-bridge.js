/**
 * ESLint Rule: require-native-bridge
 *
 * Enforces using the media-bridge abstraction for camera/microphone access
 * instead of raw browser APIs (navigator.mediaDevices).
 *
 * CORRECT:
 *   import { getMediaStream } from "@/lib/mobile/media-bridge";
 *
 * INCORRECT:
 *   navigator.mediaDevices.getUserMedia({ video: true });
 *
 * Exceptions:
 * - Test files (*.test.ts, *.spec.ts)
 * - The media-bridge itself
 * - Capacitor plugin files
 *
 * ADR: docs/adr/0128-capacitor-mobile-architecture.md
 */

const requireNativeBridge = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce using media-bridge abstraction instead of raw browser media APIs",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      useMediaBridge:
        'Do not use navigator.mediaDevices directly. Use media-bridge from "@/lib/mobile/media-bridge" for cross-platform camera/mic support. See ADR 0128.',
    },
    fixable: undefined,
  },
  create(context) {
    const filename = context.getFilename();

    // Skip test files
    if (filename.match(/\.(test|spec)\.[jt]sx?$/)) {
      return {};
    }

    // Skip the media-bridge implementation itself
    if (filename.includes("media-bridge")) {
      return {};
    }

    // Skip capacitor plugin files
    if (filename.includes("/mobile/") || filename.includes("/capacitor/")) {
      return {};
    }

    return {
      MemberExpression(node) {
        if (
          node.object.type === "MemberExpression" &&
          node.object.object.type === "Identifier" &&
          node.object.object.name === "navigator" &&
          node.object.property.name === "mediaDevices" &&
          node.property.name === "getUserMedia"
        ) {
          context.report({
            node,
            messageId: "useMediaBridge",
          });
        }
      },
    };
  },
};

export default requireNativeBridge;
