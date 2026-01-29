# Course Mode Implementation: Pre-generated Explanations

## Architecture

Course Mode now uses a two-tier approach:

1. **Pre-generated explanations** - Stored in `slide_explanations` table, fetched instantly
2. **Fallback to n8n** - Real-time generation if pre-generated content is missing
3. **Follow-up chat** - Interactive Q&A per slide using RAG

## Frontend Changes Made

### 1. `src/services/courseApi.ts`
- Queries `slide_explanations` table from `examSupabase` first
- Maps `lessonId` → `lecture_id` using `lectureFile` from courseContent
- Falls back to n8n webhook if not found

### 2. `src/components/lesson/SlideChat.tsx` (NEW)
- Collapsible chat component for follow-up questions
- Uses existing chat webhook with slide context
- Resets on slide change

### 3. `src/components/lesson/GuidedLearning.tsx`
- Added SlideChat below ExplanationPanel
- Passes current slide context for better AI answers

## Database Schema

Create in external Supabase (oqgotlmztpvchkipslnc):

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

CREATE INDEX idx_slide_explanations_lookup 
  ON slide_explanations(lecture_id, slide_number);
```

## n8n Batch Generation

See `.lovable/n8n-batch-generation-workflow.md` for detailed node-by-node instructions.

## Lecture ID Mapping

| lessonId | lecture_id |
|----------|------------|
| 1-1 | 01-Introduction |
| 1-2 | 02-Web |
| ... | ... |
| 11-1 | 22-Real_Time_Video |

## Testing

1. Create the `slide_explanations` table
2. Run the n8n batch workflow to populate it
3. Test Course Mode - should load instantly from database
4. Test fallback by requesting a slide without pre-generated content
