
# Rich Chat Formatting + Citation Restoration Plan

## Problem Summary

From your screenshots, I can see two issues:

### Issue 1: Empty Citations/Retrieved Materials
- Screenshot 2 shows the **Supabase Retrieve Lecture Notes** node IS returning data with `pageContent`, `metadata.filename`, `metadata.page_number`, etc.
- But Screenshot 3 shows **Normalize Agent Output** returns `retrieved_materials: []`
- This is because the node expects the LLM to include materials in its JSON output, but we removed that requirement for speed

### Issue 2: Plain Text Formatting
- Current rendering only handles LaTeX math via `RenderMath`
- No markdown parsing for headers, bullet points, bold, etc.
- ChatGPT uses rich formatting: headers, bullet points, blockquotes, icons, colored sections

---

## Solution Overview

### Part 1: Frontend Rich Formatting (Code Changes)

Create a new `RenderMarkdown` component that parses AI responses into beautiful, structured content like ChatGPT:

**Features:**
- Headers (`##`, `###`) with colored styling
- Bullet points and numbered lists with icons
- Bold and italic text
- Blockquotes with accent border
- Code blocks with syntax highlighting
- Emojis and visual indicators
- LaTeX math support (integrated with existing KaTeX)
- Section dividers

### Part 2: n8n Workflow Fix (Manual Steps)

Capture `retrieved_materials` directly from the vector store tool outputs instead of relying on the LLM to include them in its response.

---

## Visual Design Reference

Based on your ChatGPT screenshot, the target formatting includes:

```text
+----------------------------------------------------------+
| Correct answer:                                           |
| ✅ This procedure uses a field in the packet header...   |
+----------------------------------------------------------+

## Why this is correct (step-by-step)

We're asked for something that is **true for flow control** 
but **not true for congestion control**.

**Flow control (receiver-side protection)**
- Purpose: prevent the **receiver** from being overwhelmed
- Mechanism: the receiver **advertises a window size**
- This value is **explicitly encoded in the packet header**
- The sender **must not exceed** this advertised window

👍 This matches the correct option exactly.

---

## Why the other options are wrong

❌ **Computes a maximum window size using AIMD**
- AIMD is a **congestion control** mechanism
- Used by TCP to probe available network capacity

> One-line summary (exam-ready):
> Flow control uses an advertised window field in the packet
> header to limit the sender...
```

---

## Frontend Implementation

### File 1: Create `src/components/chat/RenderMarkdown.tsx`

A new component that:
1. Parses markdown-like syntax
2. Renders structured sections with visual styling
3. Integrates LaTeX math rendering
4. Uses icons and colors for visual hierarchy

**Parsing Logic:**
- `##` Headers: Large, colored, with bottom border
- `**text**` Bold: Semibold weight
- `- bullet` Lists: With colored bullet icons
- `> quote` Blockquotes: With accent left border
- `$math$` LaTeX: Inline/block math via KaTeX
- Special patterns: 
  - Checkmarks for correct answers
  - X marks for incorrect answers
  - Thumb icons for emphasis

### File 2: Update `src/components/chat/ChatConversation.tsx`

Replace `<RenderMath text={message.content} />` with `<RenderMarkdown content={message.content} />`

### File 3: Update `tailwind.config.ts`

Add the typography plugin for proper prose styling:
```typescript
plugins: [
  require("tailwindcss-animate"),
  require("@tailwindcss/typography")  // Add this
],
```

### File 4: Add chat-specific prose styles in `src/index.css`

Custom styles for chat markdown:
- Smaller text sizes
- Compact spacing
- Theme-aware colors
- Proper dark mode support

---

## Part 2: n8n Workflow Fix (Manual Steps)

The key insight from your screenshots:
- The **Supabase Retrieve Lecture Notes** node returns:
  ```json
  {
    "type": "text",
    "text": "{\"pageContent\":\"...\",\"metadata\":{\"source\":\"...\",\"filename\":\"07-Congestion_Control.pdf\",\"page_number\":\"07-\"}}"
  }
  ```
- This data is NOT being captured by the Normalize Agent Output node

### Option A: Capture Tool Outputs via Agent Steps (Recommended)

The n8n AI Agent node exposes tool call outputs. Add a **Code node** between the Agent and Normalize that:

1. Reads from `$json.steps` (agent execution trace)
2. Extracts tool outputs that look like vector search results
3. Parses the metadata to build `retrieved_materials`

**New "Extract Tool Results" Node Code:**
```javascript
const agentOutput = $input.first().json;

// Get the answer text
const answer = agentOutput.output ?? agentOutput.text ?? '';

// Extract tool call results from agent steps
const steps = agentOutput.steps || [];
const retrieved_materials = [];

for (const step of steps) {
  // Check if this step is a tool call
  if (step.action?.tool === 'lecture_slides_course' || 
      step.action?.tool === 'Elec3120Textbook') {
    
    const toolOutput = step.observation || '';
    
    // Parse the tool output (it's usually a JSON string)
    try {
      const parsed = typeof toolOutput === 'string' 
        ? JSON.parse(toolOutput) 
        : toolOutput;
      
      // Handle array of results
      const results = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const result of results) {
        const content = result.pageContent || result.text || '';
        const metadata = result.metadata || {};
        
        retrieved_materials.push({
          document_title: metadata.filename || metadata.source || 'Unknown',
          chapter: metadata.chapter || 'Course Material',
          page_number: metadata.page_number || 'unknown',
          source: step.action?.tool || 'lecture_slides_course',
          excerpt: content.substring(0, 500) + '...',
          similarity: metadata.similarity || null
        });
      }
    } catch (e) {
      // Skip unparseable results
      console.log('Could not parse tool output:', e);
    }
  }
}

return [{
  json: {
    answer,
    retrieved_materials
  }
}];
```

### Option B: Simpler - Return Tool Outputs Directly

If Option A is too complex, you can:
1. Add a "Window Buffer Memory" node to capture tool outputs
2. Or configure the Supabase vector store nodes to "Return All Results" and merge them

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `src/components/chat/RenderMarkdown.tsx` | Rich markdown renderer with LaTeX |
| UPDATE | `src/components/chat/ChatConversation.tsx` | Use RenderMarkdown instead of RenderMath |
| UPDATE | `tailwind.config.ts` | Add typography plugin |
| UPDATE | `src/index.css` | Add chat prose styles |

---

## n8n Manual Steps Summary

1. **Add "Extract Tool Results" Code Node** after the AI Agent nodes
2. Connect it before "Normalize Agent Output" 
3. Use the code provided above to extract materials from `$json.steps`
4. Update "Build Citations" to use the extracted materials

---

## Expected Result

### Before
```
Based on the lecture material retrieved, I can analyze the question 
about what is true about flow control but not true about congestion 
control.\n \n From the lecture slides:\n \n 1. Flow control is 
defined as ensuring the window is "less than or equal to the...
```

### After
```
## Why this is correct (step-by-step)

We're asked for something that is **true for flow control** but 
**not true for congestion control**.

**Flow control (receiver-side protection)**
- Purpose: prevent the **receiver** from being overwhelmed
- Mechanism: the receiver **advertises a window size**
- This value is **explicitly encoded in the packet header**

👍 This matches the correct option exactly.

---

## Why the other options are wrong

❌ **Computes a maximum window size using AIMD**
- AIMD (Additive Increase, Multiplicative Decrease) is a 
  **congestion control** mechanism
```

Plus clickable citations with the full excerpt visible!
