# Tool Plugin System Reference

Tool plugins are modular, reusable components that extend MirrorBuddy's capabilities. Each plugin is discoverable, voice-enabled, and integrated with the maestro system.

## Architecture Overview

The plugin system consists of:
- **ToolRegistry**: Singleton registry managing plugin registration and discovery
- **ToolOrchestrator**: Execution engine with validation, prerequisites, and error handling
- **VoiceFeedbackInjector**: Dynamic voice prompts with template variable substitution
- **DataChannel Protocol**: Real-time tool event broadcasting over WebRTC

Location: `src/lib/tools/plugin/`

See `@docs/claude/tool-architecture.md` for detailed system architecture diagram.

## ToolPlugin Interface

```typescript
interface ToolPlugin {
  id: string;                    // Unique identifier (lowercase_snake_case)
  name: string;                  // Display name
  category: ToolCategory;        // CREATION | EDUCATIONAL | NAVIGATION | ASSESSMENT | UTILITY
  schema: z.ZodSchema;          // Zod validation schema for input args
  handler: (args, context) => ToolResult;  // Execution function
  voicePrompt: string | VoicePromptConfig;  // Proposal prompt (supports template vars)
  voiceFeedback: string | VoicePromptConfig; // Confirmation feedback (supports template vars)
  voiceEnabled?: boolean;        // Enable voice features (default: true)
  triggers: string[];            // Voice trigger keywords (Italian for maestro context)
  prerequisites: string[];       // Required tool IDs or conditions
  permissions: Permission[];     // READ_CONVERSATION | READ_PROFILE | WRITE_CONTENT | VOICE_OUTPUT | FILE_ACCESS
  uiComponent?: React.ComponentType;  // Optional custom React UI component
}
```

## ToolRegistry API

```typescript
const registry = ToolRegistry.getInstance();

// Register a new plugin (throws on validation error or duplicate ID)
registry.register(plugin);

// Retrieve plugin by ID
const plugin = registry.get('plugin_id');

// Check if plugin exists
if (registry.has('plugin_id')) { ... }

// Get all registered plugins
const all = registry.getAll();

// Query by trigger keyword (case-insensitive)
const matches = registry.getByTrigger('demo');

// Query by category
const educational = registry.getByCategory(ToolCategory.EDUCATIONAL);

// Query by permission requirement
const voiceTools = registry.getByPermission(Permission.VOICE_OUTPUT);

// Unregister plugin
registry.unregister('plugin_id');

// Clear all plugins (testing)
registry.clear();
```

## ToolOrchestrator API

```typescript
const orchestrator = new ToolOrchestrator(registry);

// Set WebRTC DataChannel broadcaster for real-time events
orchestrator.setBroadcaster(broadcaster);

// Execute tool with full validation pipeline
const result = await orchestrator.execute(
  'plugin_id',
  { topic: 'Physics', type: 'simulation' },
  { userId, sessionId, maestroId, conversationHistory, userProfile, activeTools, grantedPermissions }
);

// Validate prerequisites without executing
const valid = orchestrator.validatePrerequisites(plugin, context);

// Get plugin metadata for discovery
const metadata = orchestrator.getToolMetadata('plugin_id');

// Get tools by category
const demos = orchestrator.getToolsByCategory(ToolCategory.EDUCATIONAL);
```

## VoiceFeedbackInjector API

```typescript
const injector = createVoiceFeedbackInjector();

// Get proposal prompt with context variables substituted
const proposal = injector.injectProposal('plugin_id', { topic: 'Gravity', subject: 'Physics' });

// Get confirmation feedback with result data substituted
const feedback = injector.injectConfirmation('plugin_id', result);

// Find contextually relevant tools
const tools = injector.getContextualTriggers({ topic: 'Energy', keywords: ['conservation'] });
```

## DataChannel Protocol

```typescript
enum ToolEventType {
  TOOL_PROPOSED,    // AI proposes tool to user
  TOOL_ACCEPTED,    // User accepts proposal
  TOOL_REJECTED,    // User rejects proposal
  TOOL_EXECUTING,   // Tool handler started
  TOOL_COMPLETED,   // Tool executed successfully
  TOOL_ERROR,       // Tool execution failed
}

interface ToolDataChannelMessage {
  type: ToolEventType;
  toolId: string;
  payload?: Record<string, unknown>;
  timestamp: number;  // Unix milliseconds
}

// Serialization helpers
const json = serializeMessage(message);
const msg = deserializeMessage(json);
const msg = createToolMessage(ToolEventType.TOOL_COMPLETED, 'demo_id', { success: true });
```

## Creating a New Plugin

```typescript
// src/lib/tools/plugins/my-plugin.ts
import { z } from 'zod';
import { ToolPlugin, ToolCategory, Permission } from '../plugin/types';

const InputSchema = z.object({
  topic: z.string().min(1),
  format: z.enum(['brief', 'detailed']).optional(),
});

export const myPlugin: ToolPlugin = {
  id: 'my_tool',
  name: 'My Tool',
  category: ToolCategory.EDUCATIONAL,
  schema: InputSchema,

  handler: async (args, context) => {
    const { topic, format } = InputSchema.parse(args);
    try {
      // Implementation here
      return { success: true, data: { result: '...' } };
    } catch (error) {
      return { success: false, error: 'Error message' };
    }
  },

  // Simple string or template with {variable} substitution
  voicePrompt: {
    template: 'Creare un foglio su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Creare un nuovo foglio?'
  },

  voiceFeedback: {
    template: 'Foglio su {topic} creato con {itemCount} elementi',
    requiresContext: ['topic', 'itemCount'],
    fallback: 'Foglio creato'
  },

  voiceEnabled: true,
  triggers: ['mio_tool', 'crea', 'foglio'],
  prerequisites: [],  // Optional: require other tools active
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};
```

## Voice Trigger Configuration

Triggers are keywords in Italian that maestros use to propose tools during conversation:

```typescript
triggers: [
  'demo',              // Exact match
  'mostra demo',       // Multi-word
  'visualizza',        // Synonym
  'interattivo'        // Related concept
]
```

Voice proposal: `"Vuoi creare {toolName} su {topic}?"` with context variable substitution.

## Error Handling Patterns

```typescript
import { ToolErrorCode, createErrorResult } from '../plugin/types';

// In handler
if (!validInput) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.VALIDATION_FAILED,
    'Input validation failed',
    { field: 'topic', reason: 'too short' }
  );
}

try {
  // Work
} catch (error) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.EXECUTION_FAILED,
    error instanceof Error ? error.message : 'Unknown error'
  );
}
```

## Integration Points

- **Maestro System**: Voice triggers, proposals, feedback integration
- **Conversation**: Access to `conversationHistory` in ToolExecutionContext
- **WebRTC**: Real-time event broadcasting via DataChannel
- **UI**: Optional custom React component for rich visualization
- **Database**: Via context.conversationId for result persistence

## Registration Example

```typescript
import { initializeToolRegistry } from '@/lib/tools/plugin/init';
import { myPlugin } from '@/lib/tools/plugins/my-plugin';

const registry = initializeToolRegistry();
registry.register(myPlugin);

// Use with orchestrator
const orchestrator = new ToolOrchestrator(registry);
```

## Testing

Use `ToolRegistry.getInstance().clear()` in tests to reset state between tests. Validate plugins with `ToolPluginSchema.parse()` before registration.
