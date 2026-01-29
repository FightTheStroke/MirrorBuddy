# ADR 0104: School Portal and Institutional Compliance

## Status

Proposed

## Context

Educational institutions (schools) require administrative tools to manage classes, faculty access, and monitor compliance with regulations like GDPR and parental consent.

## Decision

We will implement a School Portal (`/admin/school`) designed for institutional administrators. This portal will serve as the hub for:

1.  **Class Management:** Overview of student groups, assigned teachers, and activation status.
2.  **Compliance Monitoring:** Visual tracking of GDPR documentation status and parental consent percentages for school-enrolled students.
3.  **Faculty Administration:** Centralized access management for school staff (future implementation).

## Technical Implementation

- **Components:** `SchoolPortal` in `src/components/admin/school-portal.tsx`.
- **UI:** Consistent with the MirrorBuddy design system using `Card`, `Button`, and `Badge`.
- **Accessibility:** Integrated with `useAccessibilityStore` for high-contrast and responsive layout.

## Consequences

- **Pros:** Facilitates adoption by public and private schools; simplifies the onboarding of large student cohorts.
- **Cons:** Increases complexity of the admin routing; requires future integration with B2B/Institutional database schemas.
