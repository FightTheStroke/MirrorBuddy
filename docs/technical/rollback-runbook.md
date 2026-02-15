# Rollback Runbook and Feature-Flag Fallback Matrix

## Rollback Triggers

- Voice connect failure rate exceeds SLO for 15 minutes.
- Consent API errors exceed baseline.
- Chat response latency regression sustained for 30 minutes.

## Feature-Flag Fallback Matrix

| Capability              | Default | Rollback Action                                      |
| ----------------------- | ------- | ---------------------------------------------------- |
| voice_ga_protocol       | enabled | disable to restore preview endpoint behavior         |
| voice_full_prompt       | enabled | disable to restore truncated prompt mode             |
| voice_transcript_safety | enabled | disable only for emergency false-positive mitigation |
| voice_calling_overlay   | enabled | disable to return to previous connect UX             |
| chat_unified_view       | enabled | disable to fall back to legacy chat surfaces         |
| consent_unified_model   | enabled | disable to restore legacy consent handling           |
