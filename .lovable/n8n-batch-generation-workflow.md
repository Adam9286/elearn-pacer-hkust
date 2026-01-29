# n8n Batch Generation Workflow for Course Mode Explanations

## Overview
This workflow reads all slides from your `lecture_slides_course` table and generates comprehensive explanations for each, storing them in the `slide_explanations` table.

---

## Prerequisites

### 1. Create the `slide_explanations` Table
Run this SQL in your external Supabase (oqgotlmztpvchkipslnc):

```sql
CREATE TABLE slide_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id TEXT NOT NULL,
  slide_number INT NOT NULL,
  explanation TEXT NOT NULL,
  key_points JSONB NOT NULL,
  comprehension_question JSONB,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lecture_id, slide_number)
);

-- Index for fast lookups
CREATE INDEX idx_slide_explanations_lookup 
  ON slide_explanations(lecture_id, slide_number);

-- Enable RLS if needed
ALTER TABLE slide_explanations ENABLE ROW LEVEL SECURITY;

-- Public read policy (for app to query)
CREATE POLICY "Allow public read" ON slide_explanations
  FOR SELECT USING (true);
```

---

## Workflow Structure

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    BATCH GENERATION WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐    │
│   │   Schedule   │───▶│  Get Slides  │───▶│  Loop Over Slides     │    │
│   │   Trigger    │    │  from DB     │    │  (SplitInBatches)     │    │
│   └──────────────┘    └──────────────┘    └───────────┬───────────┘    │
│                                                        │                │
│                              ┌─────────────────────────┘                │
│                              ▼                                          │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                    For Each Slide:                           │     │
│   │                                                              │     │
│   │   ┌─────────────┐    ┌─────────────┐    ┌────────────────┐  │     │
│   │   │  Check If   │───▶│  Generate   │───▶│  Upsert to     │  │     │
│   │   │  Exists     │    │  with AI    │    │  Database      │  │     │
│   │   └─────────────┘    └─────────────┘    └────────────────┘  │     │
│   │                                                              │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Node-by-Node Configuration

### Node 1: Schedule Trigger (or Manual Trigger)
**Type:** `Schedule Trigger` or `Manual Trigger`

**Configuration:**
- For testing: Use `Manual Trigger`
- For production: Use `Schedule Trigger` with:
  - Rule: Every day at 3 AM (or when you want to regenerate)
  
**Or use a Webhook Trigger to manually trigger:**
```json
{
  "webhook": {
    "path": "/generate-explanations",
    "method": "POST"
  }
}
```

---

### Node 2: Supabase - Get All Slides
**Type:** `Supabase`

**Configuration:**
| Field | Value |
|-------|-------|
| Resource | Row |
| Operation | Get Many |
| Table | `lecture_slides_course` |
| Return All | ✅ Enabled |
| Filters | (optional) Add `lecture_id` filter to process one lecture at a time |

**Output:** Array of all slides with `id`, `lecture_id`, `slide_number`, `content`, etc.

---

### Node 3: SplitInBatches
**Type:** `SplitInBatches`

**Configuration:**
| Field | Value |
|-------|-------|
| Batch Size | 1 |
| Options → Reset | ✅ (if you want to restart from beginning) |

**Purpose:** Process slides one at a time to avoid rate limits

---

### Node 4: Wait (Rate Limiter)
**Type:** `Wait`

**Configuration:**
| Field | Value |
|-------|-------|
| Resume | After Time Interval |
| Amount | 2 |
| Unit | Seconds |

**Purpose:** Prevent API rate limiting (adjust based on your AI provider limits)

---

### Node 5: Supabase - Check If Exists
**Type:** `Supabase`

**Configuration:**
| Field | Value |
|-------|-------|
| Resource | Row |
| Operation | Get |
| Table | `slide_explanations` |
| Match | `lecture_id` = `{{ $json.lecture_id }}` AND `slide_number` = `{{ $json.slide_number }}` |

**Purpose:** Skip slides that already have explanations (incremental generation)

---

### Node 6: IF - Skip If Exists
**Type:** `IF`

**Configuration:**
```javascript
// Condition: No existing explanation found
{{ $json.id === undefined || $json.id === null }}
```

**Branches:**
- **True:** Continue to AI generation
- **False:** Skip to next slide (connect back to SplitInBatches)

---

### Node 7: Edit Fields - Prepare AI Prompt
**Type:** `Edit Fields (Set)`

**Configuration:**
| Field | Value |
|-------|-------|
| lecture_id | `{{ $('SplitInBatches').item.json.lecture_id }}` |
| slide_number | `{{ $('SplitInBatches').item.json.slide_number }}` |
| slide_content | `{{ $('SplitInBatches').item.json.content }}` |
| prompt | See below |

**Prompt Template:**
```text
You are teaching ELEC3120 Computer Networks at HKUST.

Generate a comprehensive explanation for this lecture slide.

Lecture: {{ $('SplitInBatches').item.json.lecture_id }}
Slide Number: {{ $('SplitInBatches').item.json.slide_number }}

Slide Content:
"""
{{ $('SplitInBatches').item.json.content }}
"""

Generate:
1. A detailed 2-4 paragraph explanation that:
   - Explains the core concepts clearly
   - Provides relevant examples where helpful
   - Connects to practical networking scenarios
   - Uses analogies for complex topics

2. 3-5 key bullet points summarizing the main takeaways

3. One multiple-choice comprehension question with:
   - A clear question
   - 4 options (A, B, C, D)
   - The correct answer index (0-3)
   - An explanation of why it's correct

Return as JSON:
{
  "explanation": "Your detailed explanation...",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "comprehensionQuestion": {
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "This is correct because..."
  }
}
```

---

### Node 8: AI Agent or HTTP Request (DeepSeek/OpenAI)
**Type:** `AI Agent` or `HTTP Request`

**Option A: Using AI Agent Node**
| Field | Value |
|-------|-------|
| Model | DeepSeek Chat (or your preferred model) |
| System Message | See system prompt below |
| User Message | `{{ $json.prompt }}` |

**Option B: Using HTTP Request (OpenRouter/DeepSeek API)**
| Field | Value |
|-------|-------|
| Method | POST |
| URL | `https://openrouter.ai/api/v1/chat/completions` or `https://api.deepseek.com/v1/chat/completions` |
| Authentication | Header Auth |
| Header Name | Authorization |
| Header Value | `Bearer YOUR_API_KEY` |
| Body | See below |

**Request Body:**
```json
{
  "model": "deepseek/deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert ELEC3120 Computer Networks instructor at HKUST. Generate clear, comprehensive explanations for lecture slides. Always respond with valid JSON."
    },
    {
      "role": "user",
      "content": "{{ $json.prompt }}"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

---

### Node 9: Code - Parse AI Response
**Type:** `Code`

**JavaScript:**
```javascript
// Parse the AI response and ensure proper JSON structure
const aiResponse = $input.first().json;

// Handle different response formats
let content = '';
if (aiResponse.choices && aiResponse.choices[0]) {
  content = aiResponse.choices[0].message?.content || aiResponse.choices[0].text || '';
} else if (aiResponse.content) {
  content = aiResponse.content;
} else if (typeof aiResponse === 'string') {
  content = aiResponse;
}

// Extract JSON from the response (handle markdown code blocks)
let jsonStr = content;
const jsonMatch = content.match(/```json?\s*([\s\S]*?)\s*```/);
if (jsonMatch) {
  jsonStr = jsonMatch[1];
}

// Parse the JSON
let parsed;
try {
  parsed = JSON.parse(jsonStr.trim());
} catch (e) {
  // Fallback: try to extract fields manually
  parsed = {
    explanation: content,
    keyPoints: ["Error parsing AI response - manual review needed"],
    comprehensionQuestion: null
  };
}

// Get original slide data
const slideData = $('Edit Fields - Prepare AI Prompt').first().json;

return {
  json: {
    lecture_id: slideData.lecture_id,
    slide_number: slideData.slide_number,
    explanation: parsed.explanation || '',
    key_points: parsed.keyPoints || [],
    comprehension_question: parsed.comprehensionQuestion || null
  }
};
```

---

### Node 10: Supabase - Upsert Explanation
**Type:** `Supabase`

**Configuration:**
| Field | Value |
|-------|-------|
| Resource | Row |
| Operation | Upsert |
| Table | `slide_explanations` |
| Conflict Columns | `lecture_id, slide_number` |

**Fields to Insert/Update:**
| Column | Value |
|--------|-------|
| lecture_id | `{{ $json.lecture_id }}` |
| slide_number | `{{ $json.slide_number }}` |
| explanation | `{{ $json.explanation }}` |
| key_points | `{{ $json.key_points }}` |
| comprehension_question | `{{ $json.comprehension_question }}` |
| updated_at | `{{ $now.toISO() }}` |

---

### Node 11: Connect Back to SplitInBatches
Connect the output of the Upsert node back to the `SplitInBatches` node to process the next slide.

---

## Complete Workflow Connections

```
Schedule Trigger
       │
       ▼
Supabase - Get All Slides
       │
       ▼
SplitInBatches ◄────────────────────────────────┐
       │                                         │
       ▼                                         │
Wait (2 seconds)                                 │
       │                                         │
       ▼                                         │
Supabase - Check If Exists                       │
       │                                         │
       ▼                                         │
IF - Skip If Exists ─────────────────────────────┤ (False branch - already exists)
       │                                         │
       │ (True branch - needs generation)        │
       ▼                                         │
Edit Fields - Prepare AI Prompt                  │
       │                                         │
       ▼                                         │
HTTP Request / AI Agent (Generate)               │
       │                                         │
       ▼                                         │
Code - Parse AI Response                         │
       │                                         │
       ▼                                         │
Supabase - Upsert Explanation ───────────────────┘
```

---

## Monitoring & Logging

### Add a Code Node for Logging
After the Upsert node, add a Code node to log progress:

```javascript
const slide = $input.first().json;
console.log(`✅ Generated: ${slide.lecture_id} - Slide ${slide.slide_number}`);

return {
  json: {
    status: 'success',
    lecture_id: slide.lecture_id,
    slide_number: slide.slide_number,
    timestamp: new Date().toISOString()
  }
};
```

---

## Error Handling

### Add Error Workflow
Create a separate error workflow to catch failures:

1. Add an `Error Trigger` node
2. Log the error to a table or send notification
3. Continue processing remaining slides

---

## Running the Workflow

### Option 1: Manual One-Time Run
1. Use Manual Trigger
2. Click "Test Workflow"
3. Monitor execution in n8n

### Option 2: Per-Lecture Run
Add a parameter to filter by `lecture_id`:

```javascript
// In "Get All Slides" node, add filter:
{
  "lecture_id": "{{ $json.lecture_id || '01-Introduction' }}"
}
```

### Option 3: Incremental Updates
The "Check If Exists" node ensures you only generate for new/missing slides.

---

## Estimated Time

| Slides | Wait Time | AI Response | Total |
|--------|-----------|-------------|-------|
| 100 | 2s each | ~5s each | ~12 min |
| 500 | 2s each | ~5s each | ~60 min |
| 1000 | 2s each | ~5s each | ~2 hours |

Adjust the Wait node timing based on your API rate limits.

---

## Lecture ID Mapping Reference

| Frontend lessonId | lectureFile (database lecture_id) |
|-------------------|-----------------------------------|
| 1-1 | 01-Introduction |
| 1-2 | 02-Web |
| 1-3 | 04-Video |
| 2-1 | 05-Transport_Model |
| 2-2 | 06-TCP_Basics |
| 2-3 | 07-Congestion_Control |
| 2-4 | 08-AdvancedCC |
| 3-1 | 09-Queue |
| 4-1 | 10-IP |
| 5-1 | 11-BGP |
| 5-2 | 12-BGP2 |
| 5-3 | 13-Internet |
| 6-1 | 14-Local_Area_Network |
| 6-2 | 15-LAN_Routing |
| 6-3 | 16-Link_Layer_Challenge |
| 7-1 | 17-Wireless_Network_updated |
| 8-1 | 18-CDN |
| 9-1 | 19-Datacenter |
| 10-1 | 20-Security |
| 10-2 | 21-Security2 |
| 11-1 | 22-Real_Time_Video |

---

## Summary

| Step | Node Type | Purpose |
|------|-----------|---------|
| 1 | Trigger | Start workflow |
| 2 | Supabase Get | Fetch all slides |
| 3 | SplitInBatches | Process one at a time |
| 4 | Wait | Rate limiting |
| 5 | Supabase Get | Check if already generated |
| 6 | IF | Skip existing |
| 7 | Edit Fields | Prepare prompt |
| 8 | HTTP/AI Agent | Generate explanation |
| 9 | Code | Parse response |
| 10 | Supabase Upsert | Save to database |
