# Plugin Authoring Guide

This guide walks you through creating a new tool plugin for MirrorBuddy.

## 5-Minute Overview

A plugin is a reusable tool that students can invoke through:
1. **Voice**: "Crea una mappa su Gravità" (voice trigger)
2. **UI**: Maestro proposes it during conversation
3. **Direct**: UI button in tool palette

## Step 1: Create Your Plugin File

Create `src/lib/tools/plugins/my-tool.ts`:

```typescript
import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  VoicePromptConfig,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolContext } from '@/types/tools';

// 1. Define input schema (what your tool accepts)
const MyToolInputSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(100),
  detail_level: z.enum(['basic', 'detailed']).optional().default('basic'),
  language: z.enum(['it', 'en']).optional().default('it'),
});

// 2. Define the plugin
export const myTool: ToolPlugin = {
  // Unique identifier (lowercase_snake_case)
  id: 'my_tool',

  // Display name
  name: 'My Educational Tool',

  // Category for organization
  category: ToolCategory.EDUCATIONAL,

  // Zod schema for input validation
  schema: MyToolInputSchema,

  // Handler function (the actual work)
  handler: async (args, context) => {
    try {
      // Parse and validate input
      const { topic, detail_level, language } = MyToolInputSchema.parse(args);

      // Your tool logic here
      const result = await generateToolOutput(topic, detail_level, language);

      // Return success
      return createSuccessResult('my_tool', {
        content: result,
        topic,
        itemCount: 5, // For voice feedback substitution
      });
    } catch (error) {
      // Handle errors
      if (error instanceof z.ZodError) {
        return createErrorResult(
          'my_tool',
          ToolErrorCode.VALIDATION_FAILED,
          'Invalid input: ' + error.errors[0].message,
        );
      }

      return createErrorResult(
        'my_tool',
        ToolErrorCode.EXECUTION_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  },

  // Voice proposal (what Maestro says to propose this tool)
  voicePrompt: {
    template: 'Vuoi che crei {toolName} su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi usare questo strumento?',
  },

  // Voice feedback (what Maestro says when done)
  voiceFeedback: {
    template: '{toolName} su {topic} creato con {itemCount} elementi',
    requiresContext: ['topic', 'itemCount'],
    fallback: 'Strumento creato con successo',
  },

  // Enable voice integration
  voiceEnabled: true,

  // Voice trigger keywords (lowercase, Italian)
  triggers: [
    'mio_tool',
    'my tool',
    'strumento',
    'crea',
  ],

  // Prerequisites (empty = no dependencies)
  prerequisites: [],

  // Permissions required
  permissions: [
    Permission.READ_CONVERSATION,
    Permission.WRITE_CONTENT,
    Permission.VOICE_OUTPUT,
  ],

  // Optional: React component for rich UI
  // uiComponent: MyToolCustomUI,
};

// Helper function (implement your tool logic)
async function generateToolOutput(
  topic: string,
  detailLevel: 'basic' | 'detailed',
  language: string,
): Promise<string> {
  // Call AI, compute, fetch data, etc.
  // This is where the actual tool work happens
  return `Generated output for ${topic}`;
}
```

## Step 2: Register Your Plugin

Edit `src/lib/tools/plugin/init.ts`:

```typescript
import { myTool } from '@/lib/tools/plugins/my-tool';

export function initializeToolRegistry(): ToolRegistry {
  const registry = ToolRegistry.getInstance();
  registry.clear(); // In test environments

  // Register all plugins
  registry.register(myTool);
  // ... other plugins

  return registry;
}
```

## Step 3: Voice Trigger Configuration

### Trigger Keywords

Triggers are case-insensitive Italian words that activate your tool:

```typescript
triggers: [
  'mio_tool',           // Exact match (preferred)
  'crea',              // Generic action (shared with other tools)
  'calcolo',           // Domain-specific
  'strumento',         // Generic tool reference
  'analizza dati',     // Multi-word phrase
],
```

**Best practices**:
- Use 3-5 specific triggers
- Primary trigger = your tool ID (e.g., `my_tool`)
- Include generic verbs: `crea`, `genera`, `analizza`, `mostra`, `calcola`
- Test with student vocabulary

### Template Variables

Use `{variableName}` for dynamic content:

```typescript
voicePrompt: {
  template: 'Creare {toolName} su {topic} per la classe di {subject}?',
  requiresContext: ['topic', 'subject'],
  fallback: 'Vuoi creare uno strumento educativo?',
},
```

Available context variables:
- `{toolName}` - Your tool's display name
- `{topic}` - From execution context
- `{subject}` - Maestro's subject
- `{maestroName}` - Active Maestro's name
- Custom: From your tool's result data

## Step 4: Permission Model

Choose appropriate permissions:

| Permission | Purpose | Example Tools |
|-----------|---------|---|
| `READ_CONVERSATION` | Access chat history | Summarizer, Tutor |
| `READ_PROFILE` | Access student profile | Learning Path Recommender |
| `WRITE_CONTENT` | Create/save content | Mindmap, Quiz, Demo |
| `VOICE_OUTPUT` | Generate speech response | Any voice-enabled tool |
| `FILE_ACCESS` | Import/export files | PDF exporter, File importer |

Example:

```typescript
permissions: [
  Permission.READ_CONVERSATION,  // Can read messages
  Permission.WRITE_CONTENT,      // Can save results
  Permission.VOICE_OUTPUT,       // Can speak feedback
],
```

## Step 5: Input Schema Validation

Use Zod for type-safe inputs:

```typescript
const MyToolInputSchema = z.object({
  // Required string
  topic: z.string().min(1, 'Topic required').max(200),

  // Optional enum
  format: z.enum(['list', 'tree', 'graph']).optional(),

  // Optional number with range
  complexity: z.number().min(1).max(10).optional(),

  // Array
  keywords: z.array(z.string()).min(1).optional(),

  // Boolean flag
  includeExamples: z.boolean().optional().default(true),
});
```

## Step 6: Error Handling

Use standardized error codes:

```typescript
import { ToolErrorCode, createErrorResult } from '../plugin/types';

// Validation error
if (!isValidInput) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.VALIDATION_FAILED,
    'Input validation failed',
    { field: 'topic', reason: 'must be non-empty' },
  );
}

// Prerequisite not met
if (!hasRequiredContext(context)) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.PREREQUISITES_NOT_MET,
    'Conversation history required',
  );
}

// Permission denied
if (context.grantedPermissions && !hasPermission) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.PERMISSION_DENIED,
    'Insufficient permissions',
  );
}

// Execution failed
try {
  // Work
} catch (error) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.EXECUTION_FAILED,
    error instanceof Error ? error.message : 'Unknown error',
  );
}

// Timeout
if (executionTime > MAX_DURATION) {
  return createErrorResult(
    'my_tool',
    ToolErrorCode.TIMEOUT,
    'Tool execution exceeded time limit',
  );
}
```

## Step 7: Testing Your Plugin

```typescript
import { describe, it, expect } from 'vitest';
import { myTool } from './my-tool';
import { ToolRegistry } from '../plugin/registry';

describe('myTool', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();
  });

  it('should register successfully', () => {
    registry.register(myTool);
    expect(registry.has('my_tool')).toBe(true);
  });

  it('should validate input schema', async () => {
    const result = await myTool.handler(
      { topic: 'Physics', detail_level: 'basic' },
      { userId: 'test', sessionId: 'test' },
    );
    expect(result.success).toBe(true);
  });

  it('should reject invalid input', async () => {
    const result = await myTool.handler(
      { topic: '' }, // Invalid: empty topic
      { userId: 'test', sessionId: 'test' },
    );
    expect(result.success).toBe(false);
  });

  it('should detect triggers', () => {
    registry.register(myTool);
    const matches = registry.getByTrigger('mio_tool');
    expect(matches).toContain(myTool);
  });

  it('should generate voice feedback', () => {
    const feedback = myTool.voiceFeedback;
    expect(feedback).toBeDefined();
    if (typeof feedback === 'object') {
      expect(feedback.template).toContain('{');
    }
  });
});
```

## Step 8: Integration Example

Here's how the orchestrator executes your plugin:

```typescript
// In maestro-session or conversation component
const orchestrator = new ToolOrchestrator(registry);

// Set up event broadcasting
orchestrator.setBroadcaster(broadcaster);

// Execute the tool
const result = await orchestrator.execute(
  'my_tool', // Plugin ID
  { topic: 'Gravità', detail_level: 'detailed' }, // Input args
  {
    userId: user.id,
    sessionId: session.id,
    maestroId: maestro.id,
    conversationHistory: messages,
    userProfile: student,
    activeTools: [],
    grantedPermissions: [
      Permission.READ_CONVERSATION,
      Permission.WRITE_CONTENT,
    ],
  },
);

// Handle result
if (result.success) {
  console.log('Tool executed:', result.data);
  // Render result, save to database, etc.
} else {
  console.error('Tool failed:', result.error);
}
```

## Step 9: Voice Integration

Your plugin automatically works with voice through:

1. **Voice Proposal**: Student says trigger keyword
   - TriggerDetector finds your plugin
   - Orchestrator broadcasts TOOL_PROPOSED event
   - Maestro's voicePrompt plays: "Vuoi che crei {toolName} su {topic}?"

2. **User Acceptance**: Student says "sì"
   - Orchestrator broadcasts TOOL_ACCEPTED event
   - Handler executes with detected args

3. **Voice Feedback**: Tool completes
   - Orchestrator broadcasts TOOL_COMPLETED event
   - VoiceFeedbackInjector generates voice feedback
   - Template variables substituted: "mappa su Gravità creata con 12 elementi"

## Step 10: Custom UI (Optional)

For rich visualization, provide a React component:

```typescript
import React from 'react';

interface MyToolUIProps {
  data: any;
  onClose: () => void;
}

export const MyToolUI: React.FC<MyToolUIProps> = ({ data, onClose }) => {
  return (
    <div className="p-4">
      <h2>{data.title}</h2>
      <div>{data.content}</div>
      <button onClick={onClose}>Chiudi</button>
    </div>
  );
};

// In your plugin:
export const myTool: ToolPlugin = {
  // ... other fields
  uiComponent: MyToolUI,
};
```

## Checklist

Before registering your plugin:

- [ ] Plugin ID is lowercase_snake_case
- [ ] Input schema uses Zod validation
- [ ] Handler catches errors properly
- [ ] Voice triggers are Italian and lowercase
- [ ] Voice prompts use template variables correctly
- [ ] Permissions are minimal but sufficient
- [ ] Plugin registered in `initializeToolRegistry()`
- [ ] Unit tests pass
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] No TypeScript errors in handler function
- [ ] Voice feedback includes item count for dynamic templates

## Common Patterns

### AI-powered Tool

```typescript
handler: async (args, context) => {
  const { topic } = MyToolInputSchema.parse(args);

  const response = await azure.embeddings.create({
    input: topic,
    model: 'text-embedding-3-large',
  });

  return createSuccessResult('my_tool', { embeddings: response });
}
```

### Database Query Tool

```typescript
handler: async (args, context) => {
  const { conversationId } = MyToolInputSchema.parse(args);

  const materials = await prisma.material.findMany({
    where: { conversationId },
  });

  return createSuccessResult('my_tool', {
    materials,
    itemCount: materials.length,
  });
}
```

### Context-Aware Tool

```typescript
handler: async (args, context) => {
  const { topic } = MyToolInputSchema.parse(args);

  // Access conversation history
  if (!context.conversationHistory || context.conversationHistory.length === 0) {
    return createErrorResult(
      'my_tool',
      ToolErrorCode.PREREQUISITES_NOT_MET,
      'Conversation history required',
    );
  }

  // Use it
  const previousTopics = extractTopics(context.conversationHistory);

  return createSuccessResult('my_tool', { topic, previousTopics });
}
```

## References

- `@docs/claude/tool-plugins.md` - API reference
- `@docs/claude/tool-architecture.md` - System architecture
- `src/lib/tools/plugin/types.ts` - Type definitions
- `src/lib/tools/plugin/registry.ts` - Registry implementation
- `src/lib/tools/plugin/orchestrator.ts` - Execution engine
