# Admin Features: Institutional & Research Dashboards

MirrorBuddy provides specialized administrative tools for institutional management and pedagogical research.

## Research Dashboard (`/admin/research`)

The Research Dashboard is designed for educational researchers and pedagogical leads to analyze the effectiveness of the platform's teaching methods.

### Key Metrics

- **Aggregate Participation:** Tracking student and researcher growth over time.
- **Method Efficiency:** Comparing "Scaffolding" (AI-led guidance) versus "Autonomy" (student-independent work) across subjects.
- **Learning Heatmap:** A visual matrix showing performance across different pedagogical topics and student cohorts.

### Accessibility Standards

- **ARIA Grid:** The heatmap uses `role="grid"` and `role="gridcell"` with descriptive `aria-label` attributes for each cell (e.g., "Euclide with Alex: 85% Scaffolding").
- **High Contrast:** Integrated with the platform's `useAccessibilityStore` to ensure 100% visibility in high-contrast mode.
- **Responsive Charts:** All visualizations use `ResponsiveContainer` to adapt to tablet and desktop viewports.

## School Portal (`/admin/school`)

The School Portal provides institutional administrators with the tools needed to manage school-wide deployments.

### Features

- **Class Management:** Overview of student groups, assigned faculty, and enrollment status.
- **Compliance Tracking:** Real-time monitoring of GDPR documentation status and parental consent acquisition.
- **Faculty Tools:** Quick access to faculty management and security policy configurations.

## Accessibility & i18n Framework

Recent updates have standardized accessibility and internationalization across all administrative views.

### Standards

1.  **Interactive Elements:** All buttons and inputs must have accessible labels.
2.  **Progress Indicators:** Progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
3.  **Localisation:** 100% of strings in dashboards are externalized to `it.json` and `en.json` using `next-intl`.
4.  **Semantic HTML:** Dashboards use semantic tags (`main`, `header`, `aside`) to facilitate navigation for screen reader users.

## Testing Strategy

- **Unit Tests:** Located in `src/components/admin/__tests__` and `src/components/education/__tests__`.
- **E2E Tests:** `e2e/admin-new-dashboards.spec.ts` covers navigation and functional verification of the dashboards.
- **Regression:** Visual regression tests check for high-contrast and layout consistency.
