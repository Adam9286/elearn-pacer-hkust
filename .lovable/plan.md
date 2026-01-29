
# Course Mode: AI Explanation Review & Approval System

## Overview
Create a two-phase generation workflow where AI explanations are generated into a "draft" state, allowing you to review, edit, and approve each explanation before it becomes visible to students. This ensures quality control over all pre-generated content.

## How It Will Work

```text
+-------------------+     +---------------------+     +-------------------+
| Generate Drafts   | --> | Admin Review UI     | --> | Approved Content  |
| (Edge Function)   |     | Edit + Approve      |     | (Cached for users)|
+-------------------+     +---------------------+     +-------------------+
        |                         |                          |
        v                         v                          v
  slide_explanations       You review/edit             Students see
  status = 'draft'         in admin panel              status = 'approved'
```

## Phase 1: Database Schema Update

Add a `status` column to the existing `slide_explanations` table:

```sql
-- Add status column to track draft vs approved
ALTER TABLE slide_explanations 
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected'));

-- Add index for faster admin queries
CREATE INDEX idx_slide_explanations_status ON slide_explanations(status);
```

## Phase 2: Admin Review Page

Create a new protected admin route at `/admin/review-slides`:

### Features
- **Lecture Selector**: Dropdown to pick which lecture to review (01-Introduction, 02-Web, etc.)
- **Slide List**: Shows all slides for selected lecture with status badges (Draft/Approved)
- **Preview Panel**: Shows current explanation, key points, and comprehension question
- **Edit Mode**: Textarea editors for:
  - Explanation text
  - Key points (add/remove/reorder)
  - Comprehension question + options + correct answer
- **Action Buttons**: 
  - **Save Draft**: Save edits without approving
  - **Approve**: Mark as approved (visible to students)
  - **Reject**: Mark as rejected (needs regeneration)
  - **Regenerate**: Call AI to create new draft

### UI Layout
```text
+------------------------------------------+
| Lecture: [Dropdown: 01-Introduction ▼]   |
+------------------------------------------+
| Slides (45 total) | Preview & Edit       |
|-------------------|----------------------|
| ● Slide 1 ✓      | [Explanation Text]   |
| ○ Slide 2 Draft  | ____________________  |
| ○ Slide 3 Draft  |                      |
| ○ Slide 4 ✓      | Key Points:          |
| ...              | • Point 1 [x]        |
|                  | • Point 2 [x]        |
|                  | [+ Add Point]        |
|                  |                      |
|                  | Question: _________  |
|                  | Options: A/B/C/D     |
|                  | Correct: [Dropdown]  |
|                  |                      |
|                  | [Save] [Approve] [↻] |
+------------------------------------------+
```

## Phase 3: Edge Function for Generation

Create `batch-generate-slides` that:
1. Accepts `lecture_id` parameter
2. Fetches all slides from `lecture_slides_course`
3. Generates explanation via Lovable AI (Gemini 3 Flash)
4. Saves to `slide_explanations` with `status = 'draft'`
5. Returns summary of generated slides

## Phase 4: Update Frontend Query

Modify `courseApi.ts` to only fetch **approved** explanations:
```typescript
.eq('status', 'approved')
```

This ensures students only see content you've reviewed and approved.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/config.toml` | Edit | Add `batch-generate-slides` function |
| `supabase/functions/batch-generate-slides/index.ts` | Create | Edge function to generate drafts |
| `src/pages/AdminReviewSlides.tsx` | Create | Admin review UI page |
| `src/components/admin/SlideEditor.tsx` | Create | Slide editing form component |
| `src/components/admin/LectureSelector.tsx` | Create | Lecture dropdown component |
| `src/App.tsx` | Edit | Add `/admin/review-slides` route |
| `src/services/courseApi.ts` | Edit | Filter by `status = 'approved'` |
| `src/services/adminApi.ts` | Create | API functions for admin operations |

## Technical Details

### Admin API Functions (`src/services/adminApi.ts`)
```typescript
// Fetch all slides for a lecture (any status)
export async function fetchLectureDrafts(lectureId: string)

// Update a slide explanation
export async function updateSlideExplanation(id: string, data: Partial<SlideExplanation>)

// Approve a slide
export async function approveSlide(id: string)

// Regenerate a slide (call AI again)
export async function regenerateSlide(lectureId: string, slideNumber: number)
```

### Security
- Admin page will check for your specific user ID or an admin role
- Edge function for batch generation is public (no sensitive data)
- All edit/approve operations validate user session

### Lecture IDs (22 total)
The review UI will include these lectures:
1. 01-Introduction
2. 02-Web
3. 04-Video
4. 05-Transport_Model
5. 06-TCP_Basics
6. 07-Congestion_Control
7. 08-AdvancedCC
8. 09-Queue
9. 10-IP
10. 11-BGP
11. 12-BGP2
12. 13-Internet
13. 14-Local_Area_Network
14. 15-LAN_Routing
15. 16-Link_Layer_Challenge
16. 17-Wireless_Network_updated
17. 18-CDN
18. 19-Datacenter
19. 20-Security
20. 21-Security2
21. 22-Real_Time_Video

## Workflow After Implementation

1. **Generate**: I'll call the edge function for each lecture to create drafts
2. **Review**: You access `/admin/review-slides`, select a lecture
3. **Edit**: Read each explanation, fix errors, improve clarity
4. **Approve**: Click approve when satisfied
5. **Repeat**: Work through all 22 lectures at your pace
6. **Students**: Only see approved explanations (drafts are hidden)

## Benefits
- Full quality control before students see content
- Easy batch regeneration if AI output is poor
- Edit without regenerating (save AI credits)
- Progress tracking (see how many slides approved per lecture)
