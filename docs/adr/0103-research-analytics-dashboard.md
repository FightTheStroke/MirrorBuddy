# ADR 0103: Research Analytics Dashboard

## Status

Proposed

## Context

As MirrorBuddy expands into educational research and institutional pilots, there is a need for researchers to analyze aggregate data on student progress, method efficiency (scaffolding vs. autonomy), and learning patterns. Previously, analytics were focused on technical performance or individual parent views.

## Decision

We will implement a specialized Research Dashboard within the admin section (`/admin/research`) that provides:

1.  **Aggregate Participation Metrics:** Tracking growth in student and researcher participation.
2.  **Method Efficiency Analysis:** Comparing "Scaffolding" (AI-led support) vs. "Autonomy" (student-led creation) across different subjects.
3.  **Accessible Learning Heatmap:** A visual matrix representing student performance across pedagogical topics, built with high-contrast support and ARIA-compliant grid structures for screen reader accessibility.

## Technical Implementation

- **Components:** `ResearchDashboard` in `src/components/admin/research-dashboard.tsx`.
- **Visualization:** Use `recharts` for time-series and bar charts.
- **Accessibility:**
  - Full support for `highContrast` mode from `useAccessibilityStore`.
  - ARIA roles for complex data structures (grid, progressbar).
  - Localized strings via `next-intl`.

## Consequences

- **Pros:** Provides scientific backing for the platform's effectiveness; enables data-driven pedagogical adjustments.
- **Cons:** Requires careful handling of aggregate data to ensure continued GDPR compliance (no individual PII exposed in aggregate views).
- **Security:** Ensure this route is protected by `isAdmin` guards.
