// Admin API for managing slide explanations
// Uses examSupabase (external project oqgotlmztpvchkipslnc)

import { examSupabase } from '@/lib/examSupabase';

export type SlideStatus = 'draft' | 'approved' | 'rejected';

export interface SlideExplanation {
  id: string;
  lecture_id: string;
  slide_number: number;
  explanation: string;
  key_points: string[];
  comprehension_question: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null;
  status: SlideStatus;
  created_at: string;
}

export interface LectureSummary {
  lecture_id: string;
  total: number;
  draft: number;
  approved: number;
  rejected: number;
}

/**
 * Fetch all slide explanations for a lecture (any status)
 */
export async function fetchLectureDrafts(lectureId: string): Promise<SlideExplanation[]> {
  const { data, error } = await examSupabase
    .from('slide_explanations')
    .select('*')
    .eq('lecture_id', lectureId)
    .order('slide_number', { ascending: true });

  if (error) {
    console.error('[AdminAPI] Error fetching drafts:', error);
    throw new Error(`Failed to fetch drafts: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    lecture_id: row.lecture_id,
    slide_number: row.slide_number,
    explanation: row.explanation,
    key_points: row.key_points as string[],
    comprehension_question: row.comprehension_question as SlideExplanation['comprehension_question'],
    status: (row.status || 'draft') as SlideStatus,
    created_at: row.created_at,
  }));
}

/**
 * Get summary counts for all lectures
 */
export async function fetchLectureSummaries(): Promise<LectureSummary[]> {
  const { data, error } = await examSupabase
    .from('slide_explanations')
    .select('lecture_id, status');

  if (error) {
    console.error('[AdminAPI] Error fetching summaries:', error);
    throw new Error(`Failed to fetch summaries: ${error.message}`);
  }

  // Group by lecture_id and count statuses
  const summaryMap = new Map<string, LectureSummary>();

  for (const row of data || []) {
    const lectureId = row.lecture_id;
    const status = (row.status || 'draft') as SlideStatus;

    if (!summaryMap.has(lectureId)) {
      summaryMap.set(lectureId, {
        lecture_id: lectureId,
        total: 0,
        draft: 0,
        approved: 0,
        rejected: 0,
      });
    }

    const summary = summaryMap.get(lectureId)!;
    summary.total++;
    summary[status]++;
  }

  return Array.from(summaryMap.values()).sort((a, b) => 
    a.lecture_id.localeCompare(b.lecture_id)
  );
}

/**
 * Update a slide explanation (content and/or status)
 */
export async function updateSlideExplanation(
  id: string,
  updates: Partial<Pick<SlideExplanation, 'explanation' | 'key_points' | 'comprehension_question' | 'status'>>
): Promise<void> {
  const { error } = await examSupabase
    .from('slide_explanations')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[AdminAPI] Error updating slide:', error);
    throw new Error(`Failed to update slide: ${error.message}`);
  }
}

/**
 * Approve a slide (shorthand for updating status)
 */
export async function approveSlide(id: string): Promise<void> {
  return updateSlideExplanation(id, { status: 'approved' });
}

/**
 * Reject a slide (shorthand for updating status)
 */
export async function rejectSlide(id: string): Promise<void> {
  return updateSlideExplanation(id, { status: 'rejected' });
}

/**
 * Approve all drafts for a lecture
 */
export async function approveAllSlides(lectureId: string): Promise<number> {
  const { data, error } = await examSupabase
    .from('slide_explanations')
    .update({ status: 'approved' })
    .eq('lecture_id', lectureId)
    .eq('status', 'draft')
    .select('id');

  if (error) {
    console.error('[AdminAPI] Error approving all slides:', error);
    throw new Error(`Failed to approve all slides: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Delete a slide explanation
 */
export async function deleteSlideExplanation(id: string): Promise<void> {
  const { error } = await examSupabase
    .from('slide_explanations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[AdminAPI] Error deleting slide:', error);
    throw new Error(`Failed to delete slide: ${error.message}`);
  }
}

/**
 * Trigger batch generation for a lecture
 */
export async function triggerBatchGeneration(
  lectureId: string,
  forceRegenerate: boolean = false
): Promise<{ generated: number; skipped: number; errors: { slide_number: number; error: string }[] }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-generate-slides`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        lecture_id: lectureId,
        force_regenerate: forceRegenerate,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to trigger generation: ${response.status}`);
  }

  return response.json();
}
