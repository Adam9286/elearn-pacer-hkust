
# Clickable Citations with Full Excerpt Modal

## Overview

Enhance the citation UI so users can click to view the full excerpt that the AI retrieved, along with clear metadata showing which lecture/page the content came from.

## Current State Analysis

From the n8n screenshot, `retrieved_materials` contains:
- `document_title`: "08-AdvancedCC.pdf", "07-Congestion_Control.pdf"
- `chapter`: "Advanced Congestion Control", "Congestion Control"  
- `page_number`: (currently showing "unknown")
- `source`: "lecture_slides_course"
- `excerpt`: Full text content retrieved by the RAG pipeline

### Issue Identified
The current `RetrievedMaterial` type expects `content` field, but n8n returns `excerpt`. This needs to be normalized.

## Visual Design

```text
+----------------------------------------------------------+
|  [AI Message Bubble]                                      |
|  Answer text...                                           |
|                                                           |
|  -------------------------------------------------------- |
|  SOURCES (3)                                     [▼]      |
|                                                           |
|  ┌──────────────────────────────────────────────────────┐ |
|  │  📑 08-AdvancedCC.pdf                      [Page ?]  │ |
|  │     Advanced Congestion Control                      │ |
|  │     "Recall: Mathis Equation throughput..."  [👁 View]│ |
|  └──────────────────────────────────────────────────────┘ |
+----------------------------------------------------------+

Clicking [👁 View] opens:

+----------------------------------------------------------+
|  ╔══════════════════════════════════════════════════════╗ |
|  ║  Source Details                             [✕ Close]║ |
|  ╠══════════════════════════════════════════════════════╣ |
|  ║  📑 08-AdvancedCC.pdf                                ║ |
|  ║  Chapter: Advanced Congestion Control                ║ |
|  ║  Source: Lecture Slides                              ║ |
|  ║  Match: 82%                                          ║ |
|  ╠══════════════════════════════════════════════════════╣ |
|  ║  RETRIEVED EXCERPT                                   ║ |
|  ║  ───────────────────────────────────────────────     ║ |
|  ║  "Recall: Mathis Equation throughput = 1/p * MSS     ║ |
|  ║  RTT flow A 50ms RTT vs Flow B 10ms RTT. Using       ║ |
|  ║  the Mathis Equation, Flow B will achieve higher     ║ |
|  ║  throughput than Flow A because throughput is        ║ |
|  ║  inversely proportional to RTT..."                   ║ |
|  ║                                                      ║ |
|  ║  [Full excerpt without truncation]                   ║ |
|  ╚══════════════════════════════════════════════════════╝ |
+----------------------------------------------------------+
```

## Component Architecture

### Files to Modify

| File | Change |
|------|--------|
| `src/types/chatTypes.ts` | Add `excerpt` field to `RetrievedMaterial` type |
| `src/components/chat/CitationCard.tsx` | Add clickable "View" button, integrate dialog trigger |
| `src/components/chat/MaterialPreview.tsx` | Use `excerpt` OR `content` field, add dialog state |
| `src/components/chat/SourceDetailDialog.tsx` | **NEW** - Full modal view of the retrieved content |
| `src/utils/citationParser.ts` | Update `truncateText` to handle both `content` and `excerpt` |

### New Component: SourceDetailDialog

A dialog component that shows:
1. Document title with icon
2. Chapter/topic
3. Source type badge (Lecture Slides / Textbook)
4. Similarity score badge
5. Full excerpt text (scrollable)

## Technical Implementation

### 1. Update Type Definition

Add `excerpt` as an alternative to `content` in the `RetrievedMaterial` interface to support both the old and new n8n output formats.

### 2. Update CitationCard

- Add "View" button that opens the dialog
- The button only appears when `material.excerpt` or `material.content` exists
- Keep the existing "Why this source?" collapsible as a quick preview

### 3. Create SourceDetailDialog

Uses existing shadcn `Dialog` component to show:
- Header with document title and close button
- Metadata section (chapter, source type, similarity score)
- Scrollable content area for the full excerpt
- Clean, readable typography for studying

### 4. Normalize Content Field

In `citationParser.ts`, add a helper function:
```typescript
export function getMaterialContent(material: RetrievedMaterial): string {
  return material.excerpt || material.content || '';
}
```

This ensures backward compatibility with both field names.

## Files Changed Summary

| Action | File |
|--------|------|
| UPDATE | `src/types/chatTypes.ts` - Add `excerpt?: string` field |
| UPDATE | `src/components/chat/CitationCard.tsx` - Add View button + dialog trigger |
| UPDATE | `src/components/chat/MaterialPreview.tsx` - Support excerpt field |
| CREATE | `src/components/chat/SourceDetailDialog.tsx` - Full detail modal |
| UPDATE | `src/utils/citationParser.ts` - Add `getMaterialContent` helper |
