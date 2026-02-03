
# Display Retrieved Lecture Materials in Chat Mode

## Overview

Update the frontend to display lecture slide references from your new RAG pipeline. The AI response now includes a `retrieved_materials` array instead of inline citations.

## New Backend Response Format

```json
{
  "output": "AI-generated explanation text...",
  "retrieved_materials": [
    {
      "lecture_id": "01-Introduction",
      "lecture_title": "Introduction",
      "slide_number": 3,
      "slide_text": "Definition of packet switching...",
      "similarity": 0.82
    }
  ]
}
```

## Changes Required

### 1. Update ChatMessage Interface

**File: `src/hooks/useChatHistory.ts`**

Add a new type for retrieved materials and update the message interface:

```typescript
export interface RetrievedMaterial {
  lecture_id: string;
  lecture_title?: string;
  slide_number: number;
  slide_text?: string;
  similarity?: number;
}

export interface ChatMessage {
  // ... existing fields
  source?: string;  // Keep for backwards compatibility
  retrieved_materials?: RetrievedMaterial[];  // NEW
}
```

### 2. Update LocalMessage Interface

**File: `src/components/chat/ChatConversation.tsx`**

Mirror the changes in the local message interface used for non-authenticated users.

### 3. Update Response Parsing

**Files: `src/components/ChatMode.tsx` and `src/components/chat/ChatConversation.tsx`**

Parse the new `retrieved_materials` field from the backend response:

```typescript
const payload = data.body ?? data;
const output = payload.output ?? "...";
const retrievedMaterials = payload.retrieved_materials ?? [];

// Save to database / local state
const aiMessage = await saveMessage(conversationId, {
  role: 'assistant',
  content: output,
  retrieved_materials: retrievedMaterials,
});
```

### 4. Create Lecture References Component

**New File: `src/components/chat/LectureReferences.tsx`**

A clean, secondary UI component to display retrieved lecture slides:

```text
+------------------------------------------+
| 📚 Lecture References                     |
+------------------------------------------+
| ┌────────────────────────────────────┐   |
| │ Introduction · Slide 3             │   |
| │ "Definition of packet switching..."│   |
| │                           82% match│   |
| └────────────────────────────────────┘   |
| ┌────────────────────────────────────┐   |
| │ Network Layer · Slide 12           │   |
| │ "Routing table structure..."       │   |
| │                           76% match│   |
| └────────────────────────────────────┘   |
+------------------------------------------+
```

Design decisions:
- Collapsible by default (click to expand) to reduce clutter
- Shows lecture title + slide number prominently
- Optional preview of slide_text (truncated to ~60 chars)
- Optional similarity score as a subtle percentage badge
- Only renders if `retrieved_materials.length > 0`

### 5. Update Message Rendering

**File: `src/components/chat/ChatConversation.tsx`**

Replace the current source badge with the new LectureReferences component:

```tsx
// Replace current source display (lines 487-500)
{message.retrieved_materials && message.retrieved_materials.length > 0 && (
  <LectureReferences materials={message.retrieved_materials} />
)}

// Keep fallback for legacy source string
{!message.retrieved_materials && message.source && (
  <div className="mt-3 pt-2 border-t">
    <Badge>...</Badge>
  </div>
)}
```

### 6. Database Schema Consideration

The `chat_messages` table on the external Supabase (Project 1) currently stores `source` as text. To persist `retrieved_materials`:

**Option A (Recommended)**: Store as JSONB
- Add column: `retrieved_materials JSONB DEFAULT NULL`
- Full data preserved for future features

**Option B**: Keep text-only
- Store stringified version in existing `source` column
- Parse on display (lossy, not recommended)

## Summary of Files to Change

| File | Change |
|------|--------|
| `src/hooks/useChatHistory.ts` | Add `RetrievedMaterial` interface, update `ChatMessage` |
| `src/components/chat/LectureReferences.tsx` | **NEW** - Display component for retrieved materials |
| `src/components/chat/ChatConversation.tsx` | Update interfaces, parsing, and rendering |
| `src/components/ChatMode.tsx` | Update response parsing for authenticated users |
| External Supabase schema | Add `retrieved_materials` JSONB column (optional for persistence) |

## UI Behavior

- Sources section only appears when `retrieved_materials.length > 0`
- Visually secondary: smaller text, muted colors, card/list style
- No modification to the main answer text
- Collapsible to keep chat interface clean
- Supports multiple materials (up to 3-5 typically from RAG)
