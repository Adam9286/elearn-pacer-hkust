-- Migration: Add content hashing and metadata to lecture_slides_course
-- Project: examSupabase (oqgotlmztpvchkipslnc)
-- Date: 2026-04-14
-- Purpose: Enable change detection for smart regeneration
--
-- Run this in the Supabase SQL editor for the Adam9286 Project (exam KB).

-- Add content hash for change detection
ALTER TABLE lecture_slides_course
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add word count for diagram detection heuristic
ALTER TABLE lecture_slides_course
ADD COLUMN IF NOT EXISTS word_count INTEGER;

-- Add diagram-heavy flag
ALTER TABLE lecture_slides_course
ADD COLUMN IF NOT EXISTS is_diagram_heavy BOOLEAN DEFAULT false;

-- Add extraction timestamp
ALTER TABLE lecture_slides_course
ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ DEFAULT now();

-- Index for fast hash lookups during change detection
CREATE INDEX IF NOT EXISTS idx_lecture_slides_content_hash
ON lecture_slides_course (lecture_id, slide_number, content_hash);

-- Optional: Add prompt tracking to slide_explanations for future use
ALTER TABLE slide_explanations
ADD COLUMN IF NOT EXISTS source_content_hash TEXT;

COMMENT ON COLUMN lecture_slides_course.content_hash IS 'SHA256 prefix (16 chars) of extracted slide text for change detection';
COMMENT ON COLUMN lecture_slides_course.word_count IS 'Word count of extracted text; low values suggest diagram-heavy slides';
COMMENT ON COLUMN lecture_slides_course.is_diagram_heavy IS 'True if slide has <30 words or short fragmented text (likely a diagram)';
COMMENT ON COLUMN slide_explanations.source_content_hash IS 'Hash of the slide content used to generate this explanation';
