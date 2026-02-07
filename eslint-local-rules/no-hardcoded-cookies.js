/**
 * ESLint Rule: no-hardcoded-cookies
 *
 * Blocks hardcoded cookie name strings. Use constants from cookie-constants.ts.
 *
 * ADR 0075: Cookie Handling Standards
 */

const COOKIE_NAMES = {
  "mirrorbuddy-user-id":
    "Use AUTH_COOKIE_NAME from '@/lib/auth/cookie-constants'",
  "mirrorbuddy-user-id-client":
    "Use AUTH_COOKIE_CLIENT from '@/lib/auth/cookie-constants'",
  "mirrorbuddy-admin":
    "Use ADMIN_COOKIE_NAME from '@/lib/auth/cookie-constants'",
  "mirrorbuddy-simulated-tier":
    "Use SIMULATED_TIER_COOKIE from '@/lib/auth/cookie-constants'",
  "csrf-token": "Use CSRF_TOKEN_COOKIE from '@/lib/auth/cookie-constants'",
  "convergio-user-id":
    "Use LEGACY_AUTH_COOKIE from '@/lib/auth/cookie-constants'",
  "mirrorbuddy-visitor-id":
    "Use VISITOR_COOKIE_NAME from '@/lib/auth/cookie-constants'",
};

const noHardcodedCookies = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hardcoded cookie names - use constants from cookie-constants.ts",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      hardcodedCookie:
        "{{ suggestion }} instead of hardcoded cookie name. See ADR 0075.",
    },
    fixable: undefined,
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        const suggestion = COOKIE_NAMES[node.value];
        if (suggestion) {
          context.report({
            node,
            messageId: "hardcodedCookie",
            data: { suggestion },
          });
        }
      },
    };
  },
};

export default noHardcodedCookies;
