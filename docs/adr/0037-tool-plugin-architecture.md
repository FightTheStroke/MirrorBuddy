# ADR 0037: Tool Plugin Architecture

**Status:** Accepted

**Date:** 2026-01-11

**Authors:** Engineering Team

## Context

MirrorBuddy needs to enable:
1. **Maestri proposing tools**: AI tutors should suggest tools (mind maps, quizzes, summaries) during conversations
2. **Students requesting tools vocally**: Students should ask tools via voice commands ("Create a summary", "Show me a mind map")
3. **Scalability**: Add new tools without modifying core conversation logic
4. **Voice integration**: Tools must integrate seamlessly with voice-based interactions

Current architecture couples tool logic directly into conversation handlers, making it difficult to:
- Add new tools dynamically
- Inject voice feedback for tool operations
- Maintain separation of concerns between conversation and tool orchestration

## Decision

We adopt a **Plugin-based architecture** with three core components:

### 1. ToolRegistry
Central singleton registry of available plugins with metadata:
```typescript
interface ToolPlugin {
  id: string;                    // Unique identifier (lowercase_snake_case)
  name: string;                  // Display name
  category: ToolCategory;        // CREATION | EDUCATIONAL | NAVIGATION | ASSESSMENT | UTILITY
  schema: z.ZodSchema;          // Zod validation schema
  handler: (args, context) => Promise<ToolResult>;
  voicePrompt: string | VoicePromptConfig;   // Proposal prompt
  voiceFeedback: string | VoicePromptConfig; // Confirmation feedback
  triggers: string[];            // Voice trigger keywords
  prerequisites: string[];       // Required conditions
  permissions: Permission[];     // Required permissions
}

class ToolRegistry {
  static getInstance(): ToolRegistry;  // Singleton access
  register(plugin: ToolPlugin): void;
  get(id: string): ToolPlugin | undefined;
  getByCategory(category: ToolCategory): ToolPlugin[];
  getByTrigger(keyword: string): ToolPlugin[];
  getAll(): ToolPlugin[];
  clear(): void;  // For testing
}
```

### 2. ToolOrchestrator
Coordinates tool execution with validation, timeout, and event broadcasting:
```typescript
class ToolOrchestrator {
  constructor(registry: ToolRegistry);

  // Execute tool with full validation pipeline and timeout
  execute(
    toolId: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult>;

  // Validate prerequisites without execution
  validatePrerequisites(plugin: ToolPlugin, context: ToolExecutionContext): boolean;

  // Set WebRTC DataChannel broadcaster for real-time events
  setBroadcaster(broadcaster: EventBroadcaster): void;

  // Get tools by category for discovery
  getToolsByCategory(category: ToolCategory): ToolPlugin[];
}
```

**Security Features:**
- Execution timeout (30s default) prevents indefinite hangs
- Input validation via Zod schemas
- Permission checking before execution
- Event broadcasting for monitoring

### 3. VoiceFeedbackInjector
Provides dynamic voice feedback with template variable substitution:
```typescript
class VoiceFeedbackInjector {
  constructor(registry: ToolRegistry);

  // Get proposal prompt with context variables substituted
  injectProposal(toolId: string, context: ToolContext & { topic?: string }): string;

  // Get confirmation feedback with result data substituted
  injectConfirmation(toolId: string, result: ToolResult): string;

  // Find contextually relevant tools by keywords
  getContextualTriggers(context: ToolContext & { keywords?: string[] }): string[];
}
```

**Template Variables:**
- `{toolName}` - Display name of the tool
- `{topic}` - Current conversation topic
- `{itemCount}` - Number of items in result
- `{title}` - Title of generated content

### 4. TriggerDetector
Detects tool triggers from voice transcripts:
```typescript
class TriggerDetector {
  constructor(registry: ToolRegistry);

  // Detect all triggers in transcript with confidence scores
  detectTriggers(transcript: string): DetectedTrigger[];

  // Get best matching trigger from detected results
  getBestMatch(triggers: DetectedTrigger[]): DetectedTrigger | null;
}
```

**Security:** Truncates transcripts exceeding 10KB to prevent DoS attacks.

### 5. DataChannel Protocol
Real-time tool event broadcasting over WebRTC:
```typescript
enum ToolEventType {
  TOOL_PROPOSED,   // AI proposes tool
  TOOL_ACCEPTED,   // User accepts
  TOOL_REJECTED,   // User rejects
  TOOL_EXECUTING,  // Execution started
  TOOL_COMPLETED,  // Success
  TOOL_ERROR,      // Failure
}
```

**Security:** Max message size 64KB to prevent memory exhaustion.

### Plugin Lifecycle
1. Tools register with ToolRegistry at startup
2. During conversation, ToolOrchestrator queries registry
3. Maestro can propose tools via `orchestrator.proposeTools(context)`
4. Student requests trigger `orchestrator.executeToolRequest()`
5. VoiceFeedbackInjector announces actions and results

## Consequences

### Positive
- **Scalability**: New tools added without modifying conversation logic
- **Maintainability**: Each tool encapsulates its own logic
- **Voice-native**: VoiceFeedbackInjector ensures tools integrate with voice system
- **Testability**: Tools can be tested independently via ToolRegistry
- **Flexibility**: Maestri can dynamically propose relevant tools per subject/conversation

### Negative
- **Migration effort**: Existing tool logic must be refactored into plugins
- **Complexity**: Additional abstraction layer over direct tool calls
- **Discovery overhead**: ToolRegistry must be initialized before conversation starts
- **Error handling**: Must handle tool execution failures gracefully with voice feedback

## Alternatives Considered

### 1. Handler Map Pattern (Rejected)
Direct mapping of tool IDs to handler functions:
```typescript
const handlers: Record<string, (params) => Promise<void>> = {
  'create-mindmap': createMindmapHandler,
  'create-quiz': createQuizHandler,
};
```
**Rejected because**: Lacks metadata, no voice integration, difficult to discover tools, tight coupling.

### 2. Event-Driven Architecture (Rejected)
Tools emit and listen to conversation events:
```typescript
eventBus.emit('tool-requested', { toolId, params });
eventBus.on('tool-completed', handleToolCompletion);
```
**Rejected because**: Harder to trace execution flow, difficult to inject voice feedback, event ordering issues.

## Related ADRs

- **ADR 0024**: Conversation streaming and voice integration
- **ADR 0033**: RAG semantic search (tools may leverage semantic search)
- **ADR 0034**: Chat streaming architecture (tools execute in streaming context)

## Implementation Notes

1. **Tool discovery**: Tools register via `toolRegistry.register()` in module initialization
2. **Voice commands**: Parse student transcripts for keywords ("summary", "mindmap", "quiz")
3. **Maestro proposals**: Pass `ConversationContext` to `orchestrator.proposeTools()` for intelligent suggestions
4. **Feedback timing**: Inject voice announcements before and after tool execution
5. **Error recovery**: If tool fails, provide error message via voice and allow retry

## Migration Path

1. Phase 1: Implement ToolRegistry, ToolOrchestrator, VoiceFeedbackInjector
2. Phase 2: Refactor existing tool handlers into plugin format
3. Phase 3: Integrate with voice system for tool announcements
4. Phase 4: Enable maestri to propose tools based on conversation context
