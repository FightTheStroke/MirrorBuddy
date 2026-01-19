# Trial Mode

MirrorBuddy trial mode allows anonymous users to evaluate the platform without creating an account.

## Trial Limits

| Resource      | Limit                   | Constant                     |
| ------------- | ----------------------- | ---------------------------- |
| Chat messages | 10                      | `TRIAL_LIMITS.CHAT`          |
| Voice time    | 5 minutes (300 seconds) | `TRIAL_LIMITS.VOICE_SECONDS` |
| Tool calls    | 10                      | `TRIAL_LIMITS.TOOLS`         |
| Documents     | 1                       | `TRIAL_LIMITS.DOCS`          |
| Maestri       | 3                       | `TRIAL_LIMITS.MAESTRI_COUNT` |

**Key behavior:**

- Voice and chat are tracked separately (voice does not consume chat quota)
- Each tool invocation (mind map, summary, flashcard, quiz) counts as 1 tool call
- Limits checked before and after each operation

## Key Files

| File                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `src/lib/trial/trial-service.ts`                  | Core trial logic, limits, session management |
| `src/app/api/trial/session/route.ts`              | Session creation and retrieval               |
| `src/app/api/trial/voice/route.ts`                | Voice usage tracking                         |
| `src/app/api/chat/trial-handler.ts`               | Chat and tool limit checking                 |
| `src/lib/hooks/use-trial-status.ts`               | Client-side trial status hook                |
| `src/components/trial/trial-status-indicator.tsx` | UI component showing remaining limits        |
| `src/lib/telemetry/trial-events.ts`               | Analytics events                             |

## Session Tracking

Sessions are tracked using IP hash + visitor cookie (OR query):

- Prevents cookie-clearing bypass via incognito mode
- IP hash uses SHA256(IP + salt)
- Salt rotated monthly for privacy

```typescript
// Session lookup (either IP OR cookie matches)
const session = await prisma.trialSession.findFirst({
  where: {
    OR: [{ ipHash }, { visitorId }],
  },
});
```

## API Endpoints

### GET /api/trial/session

Returns current trial status with all limits.

### POST /api/trial/session

Creates or retrieves a trial session.

### GET /api/trial/voice

Check remaining voice time.

### POST /api/trial/voice

Report voice session duration (called when voice session ends).

### GET /api/trial/analytics (Admin only)

Returns trial funnel metrics including:

- Total trials, chats, voice minutes, tool calls
- Limit hits by type (chat, voice, tool)
- Conversion rates
- Daily breakdown

## Usage in Components

```typescript
import { useTrialStatus } from "@/lib/hooks/use-trial-status";

function MyComponent() {
  const trial = useTrialStatus();

  if (trial.isLoading) return <Spinner />;
  if (!trial.isTrialMode) return <FullAccess />;

  return (
    <div>
      <p>Chats: {trial.chatsRemaining}/{trial.maxChats}</p>
      <p>Voice: {Math.floor(trial.voiceSecondsRemaining / 60)}m</p>
      <p>Tools: {trial.toolsRemaining}/{trial.maxTools}</p>
    </div>
  );
}
```

## Telemetry Events

| Event              | When               | Data                                |
| ------------------ | ------------------ | ----------------------------------- |
| `trial_start`      | Session created    | device, browser, referrer, UTM      |
| `trial_chat`       | Text message sent  | chatNumber, remainingChats          |
| `trial_voice`      | Voice session ends | durationSeconds, remainingSeconds   |
| `trial_tool`       | Tool invoked       | toolName, toolsUsed, remainingTools |
| `trial_limit_hit`  | Any limit reached  | limitType (chat/voice/tool)         |
| `beta_cta_shown`   | CTA displayed      | location                            |
| `beta_cta_clicked` | User clicks CTA    | location                            |

## Grafana Dashboard

Trial metrics are displayed in the MirrorBuddy Beta dashboard:

- `grafana/dashboards/mirrorbuddy-beta.json`

Panels include:

- Trial funnel (started, engaged, limits hit, beta requests)
- Limit hit breakdown by type (chat, voice, tool)
- Voice usage and tool calls totals
- Resource usage over time
- Average usage per trial

## ADR Reference

See [ADR-0056: Trial Mode Architecture](../adr/0056-trial-mode-architecture.md) for full design decisions.
