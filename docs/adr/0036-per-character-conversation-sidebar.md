# ADR 0036: Per-Character Conversation History Sidebar

## Status

Accepted

## Date

2026-01-11

## Context

MirrorBuddy had a centralized "Storia" (History) page for all conversations. This was:

1. **Not intuitive** - Users had to leave the current character to see history
2. **Not contextual** - Mixed all characters' conversations together
3. **Not aligned with modern UX** - ChatGPT/Claude have per-conversation sidebars

Users wanted to quickly browse past conversations with the current character without leaving the chat interface.

## Decision

We replaced the centralized Storia page with a per-character conversation sidebar:

### UX Design

1. **Position**: Right side of chat, same position as voice panel (mutually exclusive)
2. **Trigger**: History icon button in character header
3. **Content**: Only conversations for the current character
4. **Features**:
   - Search conversations
   - Date filters (Today, 7 days, 30 days, All)
   - Date grouping (Oggi, Ieri, Questa settimana, Questo mese, Più vecchie)
   - Multi-select with checkboxes
   - Batch delete with confirmation dialog
   - New conversation button (+)

### Technical Implementation

- `ConversationSidebar` component with character-specific filtering
- API endpoint `GET /api/conversations/search?maestroId={id}` for filtered queries
- API endpoint `DELETE /api/conversations/batch` for batch operations
- Gradient styling matching character theme color
- Framer Motion animations matching voice panel

### Removed Components

- "Storia" from navigation sidebar
- `storia` from `View` type
- Centralized conversation history page

### Header Changes

- Removed redundant "new conversation" button (sidebar has +)
- Phone button hidden during voice calls (voice panel has end call)
- Header always visible even during voice calls

## Consequences

### Positive

- Intuitive per-character history like ChatGPT/Claude
- Quick access without leaving conversation context
- Cleaner navigation (one less item)
- Consistent UI with voice panel placement
- Better delete UX with confirmation

### Negative

- Users lose cross-character search (can be added later if needed)
- Sidebar competes with voice panel for space

### Neutral

- Database queries now filtered by characterId
- Same conversation loading logic, just different UI entry point

## Related

- ADR 0035: Voice Session Context Continuity (loads conversation into voice)
- ADR 0028: PostgreSQL Migration (conversation storage)
