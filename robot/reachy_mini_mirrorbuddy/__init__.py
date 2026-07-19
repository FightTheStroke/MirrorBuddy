"""MirrorBuddy on Reachy Mini.

The physical embodiment of MirrorBuddy: the robot becomes a MirrorBuddy Maestro
with eyes (camera), ears (microphone), mouth (speaker) and expressive movements.

It reuses MirrorBuddy's brain end-to-end:
- Maestri personas are fetched live from MirrorBuddy's public ``/api/maestri`` endpoint.
- Voice + conversation run on Azure OpenAI Realtime (the same provider MirrorBuddy uses).
- Child-safety guardrails and DSA (accessibility) tuning mirror the MirrorBuddy web app.
"""

__version__ = "0.1.0"
