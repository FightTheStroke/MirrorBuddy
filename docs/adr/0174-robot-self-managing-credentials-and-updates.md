# ADR 0174: The robot fetches its own credentials and its own updates

**Status**: Accepted — 29 August 2026
**Context**: an Azure key rotation left the robot mute and could only be fixed by
physically reaching the hardware

## The point, in one sentence

A paired Reachy Mini gets its Azure Realtime credentials from MirrorBuddy at every
start and takes published app updates by itself, so **no adult ever has to touch the
robot again** to keep it working.

## The problem this closes

The robot used to keep a long-lived `AZURE_OPENAI_REALTIME_API_KEY` in
`~/.config/mirrorbuddy/.env`. Two consequences, both discovered the hard way during
the April 2026 credential rotation:

1. **Rotating the key breaks the robot, silently.** The web app picks up the new key
   from Vercel on the next deploy; the robot keeps presenting the retired one until
   Azure refuses it, and then simply stops speaking. Nothing in the app says why.
2. **The fix is not remotely reachable.** The robot denies SSH, and its settings page
   is not served on the network — it is reachable only through the "Reachy Mini
   Control" desktop application, over USB/Bluetooth. So repairing a rotation means a
   person, in the same room as the robot, pasting a secret by hand. For a family
   using MirrorBuddy at home, that is not a recovery procedure; it is the end of the
   product working.

The same shape applied to app updates: `self_update.py` existed but nothing called
it. Families do not read release notes and will not open a dashboard to press
Update, so in practice robots stayed on whatever version they were installed with.

## The decision

**Credentials.** `GET /api/devices/realtime-credentials` returns
`{endpoint, apiKey, deployment, apiVersion}` to a caller presenting a valid device
token as `Authorization: Bearer <token>` — the same token, and the same
`getDeviceProfile()` check, already used by `/api/devices/me`. The robot calls it at
start-up when `MIRRORBUDDY_DEVICE_TOKEN` is set and holds the result **in memory
only**. A rotation therefore reaches the robot on its next start, with no human step.

`deployment` follows the same preference order as the browser voice session
(`…_V21` → `…_V2` → base), so robot and web always speak to the same model.
`apiVersion` is **always `null`**: the robot selects the stable GA realtime protocol
exactly when no version is set, and sending the server's own value would silently
push the hardware back onto the deprecated preview protocol.

**Updates.** `self_update.start_background_check()` runs the existing update check on
a daemon thread at start-up. Anything it installs takes effect at the following
start. The check can never delay a session and can never fail into the app.

## Why not an ephemeral token

`/api/realtime/ephemeral-token` already mints short-lived Azure client secrets for
the browser, and minting one per robot session would be strictly better. It is not
what ships here because Azure's ephemeral client secrets are designed for the WebRTC
`Authorization: Bearer` flow, and **it is unverified** whether they are accepted as
the `api-key` header on the WebSocket path the robot uses. Shipping an unverified
auth change into hardware nobody can reach remotely is precisely the failure mode
this ADR exists to prevent.

The standing key served over HTTPS to an authenticated device is still a clear
improvement: the key stops living at rest on the robot's disk, and it becomes
revocable — revoking the device token cuts the robot off from the credentials.
**Follow-up**: verify the ephemeral secret against the WebSocket handshake and, if it
works, switch this endpoint to mint one per request.

## Deliberate constraints

- **The local `AZURE_OPENAI_REALTIME_*` values stay as a fallback.** An unpaired
  robot, or a paired one that cannot reach the backend, still starts and still
  speaks. A transient network failure must never be the reason a child has no robot
  today — the same rule that governs the update path.
- **Nothing is written to disk.** The fetched key exists for the life of the process.
- **`Cache-Control: no-store`** on the response, and rate limiting at the
  `DEVICE_ME` budget (60/min).
- **`MIRRORBUDDY_AUTO_UPDATE=0`** pins a robot to its current version, for a device
  being used in a demo or under investigation.

## Consequences

- Rotating the Azure key is now a server-side operation only. The robot needs a
  restart, nothing else.
- Revoking a device from the parent's settings now also revokes its ability to obtain
  voice credentials, not just its access to the child's profile.
- The robot's settings page keeps its Azure fields: they remain the escape hatch for
  an unpaired robot and for local development.
