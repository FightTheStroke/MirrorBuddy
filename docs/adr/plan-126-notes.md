# Plan 126 — Production-Ready-Deploy Running Notes

## W1-Mobile-Build

- Decision: Separate next.config.mobile.ts for Capacitor builds instead of modifying main config
- Issue: webDir:"out" vs output:"standalone" mismatch — resolved with dual-config approach
- Pattern: Mobile builds use static export, web deployment uses standalone server
