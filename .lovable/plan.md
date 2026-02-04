
# Academic Citation Display System for Chat Mode

## Overview

Redesign the chat citation UI to handle the new backend response contract that provides structured `answer`, `citations`, and `retrieved_materials` fields. The goal is a clean, academic-focused interface that prioritizes answer readability while providing transparent, trustworthy source attribution.

## New Backend Response Contract

```json
{
  "answer": "Plain-text explanation...",
  "citations": [
    "- ELEC3120 Textbook, Chapter 3: Transport Layer, Page 199 (LOCAL_UPLOAD)",
    "- Lecture Notes, TCP Congestion Control, Slide 12 (LOCAL_UPLOAD)"
  ],
  "retrieved_materials": [
    {
      "content": "...",
      "page_number": 199,
      "chapter": "Chapter 3: Transport Layer",
      "document_title": "ELEC3120 Textbook",
      "source_url": "LOCAL_UPLOAD",
      "similarity": 0.82
    }
  ]
}
```

## Visual Design Hierarchy

```text
+----------------------------------------------------------+
|  [AI Message Bubble]                                      |
|                                                           |
|  Answer text displays here in clean, readable format.     |
|  Optimized spacing for studying. No inline clutter.       |
|  This is the primary content students should focus on.    |
|                                                           |
|  -------------------------------------------------------- |
|                                                           |
|  📚 Sources (2)                              [Expand ▼]   |
|                                                           |
|  ┌──────────────────────────────────────────────────────┐ |
|  │  📖 ELEC3120 Textbook                                │ |
|  │     Chapter 3: Transport Layer                       │ |
|  │     Page 199                                         │ |
|  │                                    [Why this? ▶]     │ |
|  └──────────────────────────────────────────────────────┘ |
|                                                           |
|  ┌──────────────────────────────────────────────────────┐ |
|  │  📑 Lecture Notes                                    │ |
|  │     TCP Congestion Control                           │ |
|  │     Slide 12                                         │ |
|  │                                    [Why this? ▶]     │ |
|  └──────────────────────────────────────────────────────┘ |
|                                                           |
|  ⏱ 3.42s                                                  |
+----------------------------------------------------------+
```

### No Citation Case

```text
+----------------------------------------------------------+
|  [AI Message Bubble]                                      |
|                                                           |
|  Answer text based on general knowledge...                |
|                                                           |
|  -------------------------------------------------------- |
|                                                           |
|  ⚠️ General Knowledge                                     |
|  This answer is based on general knowledge,               |
|  not course materials. Verify with your slides.           |
|                                                           |
+----------------------------------------------------------+
```

## Component Architecture

### New/Updated Files

| File | Purpose |
|------|---------|
| `src/types/chatTypes.ts` | **NEW** - Centralized types for citations and materials |
| `src/components/chat/CitationSection.tsx` | **NEW** - Main citations container with collapse/expand |
| `src/components/chat/CitationCard.tsx` | **NEW** - Individual citation display card |
| `src/components/chat/MaterialPreview.tsx` | **NEW** - "Why this source?" expandable preview |
| `src/components/chat/NoCitationNotice.tsx` | **NEW** - Warning for general knowledge answers |
| `src/hooks/useChatHistory.ts` | **UPDATE** - Add new types for citations |
| `src/components/chat/ChatConversation.tsx` | **UPDATE** - Integrate new citation components |
| `src/components/ChatMode.tsx` | **UPDATE** - Parse new response format |
| `src/utils/citationParser.ts` | **NEW** - Parse citation strings into structured data |

### Component Hierarchy

```text
ChatConversation
└── Message Bubble
    ├── RenderMath (answer text)
    ├── CitationSection (if citations exist)
    │   ├── CitationCard (for each citation)
    │   │   └── MaterialPreview (expandable)
    │   └── CitationCard...
    └── NoCitationNotice (if no course materials used)
```

## Implementation Details

### 1. New Types (`src/types/chatTypes.ts`)

```typescript
export interface ParsedCitation {
  documentTitle: string;      // "ELEC3120 Textbook" or "Lecture Notes"
  chapter?: string;           // "Chapter 3: Transport Layer"
  pageNumber?: number;        // 199
  slideNumber?: number;       // 12
  sourceType: 'textbook' | 'lecture' | 'unknown';
}

export interface RetrievedMaterial {
  content: string;
  page_number?: number;
  chapter?: string;
  document_title: string;
  source_url: string;
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];              // NEW - Raw citation strings
  retrieved_materials?: RetrievedMaterial[];  // NEW - Full material data
  responseTime?: string;
  attachments?: Array<{ name: string; url: string; type: string; }>;
  created_at: string;
}
```

### 2. Citation Parser Utility (`src/utils/citationParser.ts`)

Parse raw citation strings into structured display data:

```typescript
// Input:  "- ELEC3120 Textbook, Chapter 3: Transport Layer, Page 199 (LOCAL_UPLOAD)"
// Output: { documentTitle: "ELEC3120 Textbook", chapter: "Chapter 3: Transport Layer", pageNumber: 199, sourceType: "textbook" }

export function parseCitation(raw: string): ParsedCitation;
export function isNoCitationMessage(citations: string[]): boolean;
export function matchMaterialToCitation(citation: ParsedCitation, materials: RetrievedMaterial[]): RetrievedMaterial | null;
```

### 3. CitationSection Component

Main container that:
- Shows citation count badge
- Defaults to collapsed state for cleaner UI
- Expands to show all citations
- Only renders if citations exist AND are not "no materials" message

Props:
```typescript
interface CitationSectionProps {
  citations: string[];
  retrievedMaterials?: RetrievedMaterial[];
}
```

### 4. CitationCard Component

Individual citation display with:
- Icon based on source type (book for textbook, file for slides)
- Document title (bold, primary)
- Chapter/topic name (muted)
- Page/slide number (badge style)
- Optional "Why this?" expand trigger

Visual styling:
- Light border, subtle background
- Academic feel (think Notion or Obsidian)
- Compact but readable

### 5. MaterialPreview Component

Expandable section showing:
- Content snippet (first ~150 chars)
- Similarity score as subtle percentage badge
- Source URL indicator

### 6. NoCitationNotice Component

Displayed when:
- `citations` array contains "No course materials were retrieved"
- OR `citations.length === 0` AND response exists

Design:
- Warning/info style (amber/yellow tint)
- Icon: ⚠️ or ℹ️
- Message: "This answer is based on general knowledge, not course materials."
- Subtle, non-alarming

### 7. Update ChatConversation.tsx

Replace current `LectureReferences` component with new citation system:

```tsx
{/* Citation Section - only if citations exist */}
{message.citations && message.citations.length > 0 && (
  isNoCitationMessage(message.citations) ? (
    <NoCitationNotice />
  ) : (
    <CitationSection
      citations={message.citations}
      retrievedMaterials={message.retrieved_materials}
    />
  )
)}

{/* Legacy fallback for old messages */}
{!message.citations && message.retrieved_materials && (
  <LectureReferences materials={message.retrieved_materials} />
)}
```

### 8. Update Response Parsing

In both `ChatMode.tsx` and `ChatConversation.tsx`:

```typescript
const payload = data.body ?? data;
const answer = payload.answer ?? payload.output ?? "...";
const citations = payload.citations ?? [];
const retrievedMaterials = payload.retrieved_materials ?? [];

const aiMessage = await saveMessage(conversationId, {
  role: 'assistant',
  content: answer,
  citations: citations,
  retrieved_materials: retrievedMaterials,
});
```

## Styling Guidelines

### Colors (Academic Theme)
- Citation cards: `bg-muted/30` with `border-border/50`
- Document title: `text-foreground font-medium`
- Chapter/page: `text-muted-foreground text-sm`
- Page badge: `bg-primary/10 text-primary`
- No-citation notice: `bg-amber-50 dark:bg-amber-900/20 border-amber-200`

### Typography
- Answer text: Default size, generous line-height (1.6-1.8)
- Citations header: `text-xs font-medium uppercase tracking-wide`
- Document titles: `text-sm font-medium`
- Secondary info: `text-xs text-muted-foreground`

### Spacing
- Answer to citations separator: `mt-4 pt-3 border-t`
- Between citation cards: `gap-2`
- Card internal padding: `px-3 py-2.5`

## Database Schema Consideration

The `chat_messages` table in external Supabase (Project 1) needs:

```sql
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS retrieved_materials JSONB DEFAULT NULL;
```

This preserves full citation data for:
- Displaying past conversations correctly
- Future analytics (which sources are most helpful)
- Click-to-view-source features

## Future Extensibility

The design supports:
1. **Click to view source**: Citation cards can become clickable links
2. **Page preview modal**: MaterialPreview can trigger a lightbox
3. **Exam citations**: Same format works for "this is from past exam Q3"
4. **Similarity filtering**: UI ready for "show only high-confidence sources"
5. **Cross-reference navigation**: Link directly to Course Mode slides

## Files Changed Summary

| Action | File |
|--------|------|
| CREATE | `src/types/chatTypes.ts` |
| CREATE | `src/utils/citationParser.ts` |
| CREATE | `src/components/chat/CitationSection.tsx` |
| CREATE | `src/components/chat/CitationCard.tsx` |
| CREATE | `src/components/chat/MaterialPreview.tsx` |
| CREATE | `src/components/chat/NoCitationNotice.tsx` |
| UPDATE | `src/hooks/useChatHistory.ts` |
| UPDATE | `src/components/chat/ChatConversation.tsx` |
| UPDATE | `src/components/ChatMode.tsx` |
| KEEP   | `src/components/chat/LectureReferences.tsx` (legacy fallback) |
