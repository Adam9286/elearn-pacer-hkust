export interface FormattedSource {
  label: string;
  type: 'knowledge-base' | 'lecture' | 'document' | 'unknown';
}

/**
 * Formats raw source strings from the AI response into professional display labels.
 * Handles various patterns like "Based on knowledge base (vector store)", "Sources: - blob", etc.
 */
export const formatSource = (rawSource: string): FormattedSource => {
  const lowerSource = rawSource.toLowerCase();
  
  // Handle "Based on knowledge base (vector store)" pattern
  if (lowerSource.includes('knowledge base') || lowerSource.includes('vector store')) {
    return {
      label: 'Course Materials',
      type: 'knowledge-base',
    };
  }
  
  // Handle "Sources: - blob" or similar patterns
  if (lowerSource.includes('blob')) {
    return {
      label: 'Course Materials',
      type: 'knowledge-base',
    };
  }
  
  // Handle lecture references (e.g., "Lecture 5", "lecture_5")
  const lectureMatch = rawSource.match(/lecture[_\s]*(\d+)/i);
  if (lectureMatch) {
    return {
      label: `Lecture ${lectureMatch[1]}`,
      type: 'lecture',
    };
  }
  
  // Handle chapter references
  const chapterMatch = rawSource.match(/chapter[_\s]*(\d+)/i);
  if (chapterMatch) {
    return {
      label: `Chapter ${chapterMatch[1]}`,
      type: 'lecture',
    };
  }
  
  // Handle specific document names (clean up file extensions and prefixes)
  const cleanSource = rawSource
    .replace(/\.pdf$/i, '')
    .replace(/\.docx?$/i, '')
    .replace(/\.txt$/i, '')
    .replace(/^Sources?:\s*/i, '')
    .replace(/^-\s*/, '')
    .replace(/^\s*based on\s*/i, '')
    .trim();
  
  if (cleanSource && cleanSource.length > 0 && cleanSource !== 'blob') {
    // Capitalize first letter for display
    const formattedLabel = cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
    return {
      label: formattedLabel,
      type: 'document',
    };
  }
  
  // Default fallback
  return {
    label: 'Course Reference',
    type: 'unknown',
  };
};

/**
 * Returns an appropriate icon name based on the source type.
 */
export const getSourceIconType = (type: FormattedSource['type']): 'book' | 'file' | 'database' => {
  switch (type) {
    case 'lecture':
      return 'book';
    case 'document':
      return 'file';
    case 'knowledge-base':
    default:
      return 'database';
  }
};
