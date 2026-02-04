

# Fix Citation Display: Show Vector Database Results

## Problem Analysis

From your screenshots:
1. **n8n workflow** clearly shows "12 items total" flowing through the tools, indicating the vector database IS being queried successfully
2. **Frontend** shows "General Knowledge" notice, meaning `citations` is either empty or contains the fallback message
3. **Root cause**: The `Extract Tool Results` node cannot find tool outputs because the n8n AI Agent stores them in a different structure than expected

### Data Flow Issue

```text
Auto Agent (12 items total)
       │
       ▼ output structure: { output: "...", ??? }
       │
Extract Tool Results
       │ Looking for: intermediateSteps or steps
       │ Finding: NOTHING (wrong key path)
       │
       ▼ returns: { answer: "...", retrieved_materials: [] }
       │
Build Citations
       │ materials.length = 0, so:
       │
       ▼ returns: { citations: ["- No course materials were retrieved..."] }
       │
Frontend: isNoCitationMessage() = TRUE → Shows "General Knowledge"
```

---

## Solution: Two-Part Fix

### Part 1: n8n Workflow Fix (Manual Steps)

The n8n AI Agent with `returnIntermediateSteps: true` returns data in a specific format. You need to add a debug node to see the actual structure.

**Step 1: Add Debug Node**

Add a Code node right after the Auto Agent, before Extract Tool Results:

```javascript
// DEBUG: Inspect agent output structure
const data = $input.first().json;

console.log('=== AGENT OUTPUT DEBUG ===');
console.log('Top-level keys:', Object.keys(data));

// Check common locations
const locations = [
  'intermediateSteps',
  'steps',
  'toolCalls',
  'actions',
  'tool_calls',
  '_intermediateSteps',
  'data.intermediateSteps'
];

for (const key of Object.keys(data)) {
  const value = data[key];
  if (Array.isArray(value)) {
    console.log(`${key}: Array[${value.length}]`);
    if (value.length > 0) {
      console.log(`  First item keys:`, Object.keys(value[0]));
    }
  } else if (typeof value === 'object' && value !== null) {
    console.log(`${key}: Object with keys:`, Object.keys(value));
  }
}

return [{ json: data }];
```

Run the workflow and check the console output to find where `intermediateSteps` actually lives.

**Step 2: Update Extract Tool Results Based on Debug Output**

Based on n8n agent documentation, the steps are often directly in the output. Try this updated code:

```javascript
const agentOutput = $input.first().json;

// Get the answer text
const answer = agentOutput.output ?? agentOutput.text ?? '';

// n8n may return steps in different locations depending on version
const steps = 
  agentOutput.intermediateSteps ||  // Standard location
  agentOutput.steps ||              // Alternative
  agentOutput.toolCalls ||          // Some versions
  (agentOutput.data && agentOutput.data.intermediateSteps) || // Nested
  [];

const retrieved_materials = [];

console.log('Steps type:', typeof steps);
console.log('Steps is array:', Array.isArray(steps));
console.log('Steps length:', Array.isArray(steps) ? steps.length : 'N/A');

// If steps is still empty, check if tool results are inline in the output
if (steps.length === 0) {
  // Sometimes n8n embeds tool results directly
  // Try to extract from the agent's raw response
  console.log('No steps found, checking for inline results...');
}

for (const step of steps) {
  console.log('Step keys:', Object.keys(step));
  
  // n8n uses 'action' for the tool call details
  const action = step.action || step;
  const toolName = action.tool || action.name || '';
  
  console.log('Tool name:', toolName);
  
  // Check if this is a vector store retrieval
  if (toolName.toLowerCase().includes('lecture') || 
      toolName.toLowerCase().includes('textbook') || 
      toolName.toLowerCase().includes('supabase')) {
    
    // Get the observation (tool output)
    let toolOutput = step.observation || step.result || step.output || '';
    
    console.log('Tool output type:', typeof toolOutput);
    console.log('Tool output preview:', String(toolOutput).substring(0, 200));
    
    try {
      const parsed = typeof toolOutput === 'string' 
        ? JSON.parse(toolOutput) 
        : toolOutput;
      
      const results = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const result of results) {
        if (!result) continue;
        
        const content = result.pageContent || result.text || result.content || '';
        const metadata = result.metadata || {};
        
        retrieved_materials.push({
          document_title: metadata.filename || metadata.source || 'Course Material',
          chapter: metadata.chapter || metadata.section || 'Course Material',
          page_number: metadata.page_number || metadata.page || 'unknown',
          source: toolName.toLowerCase().includes('textbook') ? 'elec3120_textbook' : 'lecture_slides_course',
          excerpt: content.length > 500 ? content.substring(0, 500) + '...' : content,
          similarity: metadata.similarity || metadata.score || null
        });
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  }
}

console.log('Final retrieved_materials count:', retrieved_materials.length);

return [{
  json: {
    answer,
    retrieved_materials
  }
}];
```

**Step 3: Alternative Approach - Capture Tool Outputs Directly**

If the above doesn't work, the most reliable solution is to capture tool outputs **before** they reach the agent. Add a Code node that intercepts the Supabase retrieval results:

1. Disconnect the Supabase vector store nodes from the AI Agent
2. Connect them to a "Capture Results" Code node first
3. Then connect that node to the Agent

However, this requires restructuring the workflow. The simpler fix is finding where n8n puts `intermediateSteps`.

---

### Part 2: Frontend Fix (Code Changes)

Update the citation display logic to use `retrieved_materials` directly if `citations` is empty/fallback, since the materials may exist even when citations formatting fails.

**File: `src/components/chat/ChatConversation.tsx`**

Change the citation rendering logic (lines 500-509):

**Current:**
```tsx
{message.citations && message.citations.length > 0 && (
  isNoCitationMessage(message.citations) ? (
    <NoCitationNotice />
  ) : (
    <CitationSection ... />
  )
)}
```

**New:**
```tsx
{/* Show citations if available */}
{message.citations && message.citations.length > 0 && !isNoCitationMessage(message.citations) && (
  <CitationSection
    citations={message.citations}
    retrievedMaterials={message.retrieved_materials}
  />
)}

{/* Show retrieved materials directly if we have them but citations failed */}
{(!message.citations || message.citations.length === 0 || isNoCitationMessage(message.citations)) && 
  message.retrieved_materials && message.retrieved_materials.length > 0 && (
  <CitationSection
    citations={message.retrieved_materials.map(m => 
      `- ${m.document_title || 'Course Material'}, ${m.chapter || ''}, Page ${m.page_number || 'unknown'} (${m.source || 'course'})`
    )}
    retrievedMaterials={message.retrieved_materials}
  />
)}

{/* Only show General Knowledge if truly no materials */}
{message.citations && isNoCitationMessage(message.citations) && 
  (!message.retrieved_materials || message.retrieved_materials.length === 0) && (
  <NoCitationNotice />
)}
```

This change:
1. Shows `CitationSection` if valid citations exist
2. Falls back to generating citations from `retrieved_materials` if they exist
3. Only shows "General Knowledge" if there are truly NO materials

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/chat/ChatConversation.tsx` | UPDATE | Fix citation display logic to use retrieved_materials as fallback |

---

## Summary of Fixes

### n8n (You do manually)
1. Add debug node after Auto Agent to inspect output structure
2. Find where `intermediateSteps` actually lives
3. Update `Extract Tool Results` code to use correct path

### Frontend (I will implement)
1. Update ChatConversation to build citations from `retrieved_materials` if `citations` is empty
2. Only show "General Knowledge" when both `citations` AND `retrieved_materials` are truly empty

---

## Expected Result

After these fixes:
- If n8n extracts materials correctly → Citations appear from `citations` array
- If n8n fails to extract but materials exist → Citations built from `retrieved_materials` 
- Only shows "General Knowledge" when the agent truly used no course materials

