
# Simplify Citation Sources Display

## Problem
Looking at the screenshot, the current sources display has issues:
1. Document titles show generic "Course Material" instead of "Lecture 10: IP" or "Textbook Page 74"
2. The "Why this source?" section shows raw JSON metadata instead of readable quotes
3. Too much visual clutter with redundant information

## Solution
Create a cleaner, simpler source display that:
1. Shows just the lecture number/name OR textbook page
2. Only displays quotes if there's actual readable text (not JSON)
3. Stays blank/minimal if no valid quote content

## New Design

```text
BEFORE (current - cluttered with raw JSON):
┌──────────────────────────────────────────────────────────┐
│ 📄 Course Material                              [View]   │
│    Course Material                                       │
│ ▼ Why this source?                                      │
│   ┌────────────────────────────────────────────────────┐│
│   │ 📄 "{"pageContent":"74How IP addresses are...      ││
│   │      {"source":"pypdf2_ingest_v2",...}}"           ││
│   └────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘

AFTER (clean and minimal):
┌──────────────────────────────────────────────────────────┐
│ 📄 Lecture 10: IP                           Page 74     │
│                                                          │
│ "DHCP is commonly used in wireless networks where       │
│  devices associate with an access point..."              │
└──────────────────────────────────────────────────────────┘

OR (if no valid quote):
┌──────────────────────────────────────────────────────────┐
│ 📄 Lecture 10: IP                           Page 74     │
└──────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Files to Modify

**1. `src/utils/citationParser.ts`**
- Add `isValidQuote()` function to detect JSON vs readable text
- Add `extractLectureInfo()` to parse lecture numbers from filenames
- Improve `getMaterialContent()` to extract text from JSON if needed

**2. `src/components/chat/CitationCard.tsx`**
- Simplify to single-line format: Icon + Lecture Name + Page Badge
- Show quote directly (not in collapsible) if valid
- Remove the "View" button and complex nesting

**3. Remove `src/components/chat/MaterialPreview.tsx`**
- Replace with inline quote display in CitationCard

### Code Changes

**citationParser.ts - Add helper functions:**
```typescript
/**
 * Check if content looks like valid readable text (not JSON or metadata)
 */
export function isValidQuote(content: string): boolean {
  if (!content || content.trim().length === 0) return false;
  
  // Reject if it looks like JSON
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  if (trimmed.includes('"pageContent"') || trimmed.includes('"metadata"')) return false;
  if (trimmed.includes('"source":') || trimmed.includes('"has_ocr"')) return false;
  
  // Reject if too short (less than 20 chars of actual content)
  if (trimmed.length < 20) return false;
  
  return true;
}

/**
 * Extract lecture number from document title or filename
 * "10-IP.pdf" -> "Lecture 10: IP"
 * "Lecture Notes - TCP" -> "Lecture Notes: TCP"
 */
export function formatLectureName(docTitle: string, material?: RetrievedMaterial): string {
  if (!docTitle || docTitle === 'Course Material') {
    // Try to extract from material filename if available
    const filename = material?.source_url || '';
    const lectureMatch = filename.match(/(\d+)-([^.]+)/);
    if (lectureMatch) {
      return `Lecture ${parseInt(lectureMatch[1])}: ${lectureMatch[2].replace(/_/g, ' ')}`;
    }
  }
  
  // Check if it's already formatted
  if (docTitle.toLowerCase().includes('lecture')) {
    return docTitle;
  }
  
  // Check for textbook
  if (docTitle.toLowerCase().includes('textbook')) {
    return 'Textbook';
  }
  
  return docTitle;
}
```

**CitationCard.tsx - Simplified component:**
```tsx
export const CitationCard = ({ citation, material }: CitationCardProps) => {
  const Icon = citation.sourceType === 'textbook' ? Book : FileText;
  
  // Get clean lecture/source name
  const sourceName = formatLectureName(citation.documentTitle, material);
  
  // Get page/slide location
  const location = citation.pageNumber 
    ? `Page ${citation.pageNumber}` 
    : citation.slideNumber 
      ? `Slide ${citation.slideNumber}` 
      : null;
  
  // Get quote content if valid
  const rawContent = getMaterialContent(material);
  const quote = rawContent && isValidQuote(rawContent) ? truncateText(rawContent, 150) : null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
      {/* Source header: Icon + Name + Page badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {sourceName}
          </span>
        </div>
        
        {location && (
          <Badge 
            variant="secondary" 
            className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary border-0 font-medium"
          >
            {location}
          </Badge>
        )}
      </div>
      
      {/* Quote - only shown if valid readable content */}
      {quote && (
        <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">
          "{quote}"
        </p>
      )}
    </div>
  );
};
```

### Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Title | "Course Material" | "Lecture 10: IP" |
| Structure | Collapsible "Why this source?" | Inline quote (if valid) |
| JSON content | Shows raw JSON | Hidden (shows nothing) |
| View button | Always shown | Removed |
| Visual weight | Heavy, nested | Light, single card |

This makes sources clean and useful - showing only the lecture name, page number, and actual quotes when available.
