import { ParsedCitation, RetrievedMaterial } from '@/types/chatTypes';

/**
 * Parse a raw citation string into structured data
 * @example
 * Input:  "- ELEC3120 Textbook, Chapter 3: Transport Layer, Page 199 (LOCAL_UPLOAD)"
 * Output: { documentTitle: "ELEC3120 Textbook", chapter: "Chapter 3: Transport Layer", pageNumber: 199, sourceType: "textbook" }
 */
export function parseCitation(raw: string): ParsedCitation {
  // Remove leading dash and trim
  const cleaned = raw.replace(/^-\s*/, '').trim();
  
  // Remove the source indicator suffix like (LOCAL_UPLOAD)
  const withoutSource = cleaned.replace(/\s*\([^)]+\)\s*$/, '').trim();
  
  // Split by comma to get parts
  const parts = withoutSource.split(',').map(p => p.trim());
  
  // Extract document title (first part)
  const documentTitle = parts[0] || 'Unknown Source';
  
  // Determine source type
  const sourceType: 'textbook' | 'lecture' | 'unknown' = 
    documentTitle.toLowerCase().includes('textbook') ? 'textbook' :
    documentTitle.toLowerCase().includes('lecture') ? 'lecture' : 'unknown';
  
  // Find chapter (contains "Chapter" keyword)
  const chapterPart = parts.find(p => p.toLowerCase().includes('chapter'));
  const chapter = chapterPart || undefined;
  
  // Find page number
  const pagePart = parts.find(p => /page\s*\d+/i.test(p));
  const pageMatch = pagePart?.match(/page\s*(\d+)/i);
  const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
  
  // Find slide number
  const slidePart = parts.find(p => /slide\s*\d+/i.test(p));
  const slideMatch = slidePart?.match(/slide\s*(\d+)/i);
  const slideNumber = slideMatch ? parseInt(slideMatch[1], 10) : undefined;
  
  // If no chapter found, try to get topic from remaining parts (for lecture notes)
  let topicChapter = chapter;
  if (!topicChapter && parts.length > 1) {
    // For lecture notes, the second part is often the topic
    const potentialTopic = parts[1];
    if (potentialTopic && !pagePart?.includes(potentialTopic) && !slidePart?.includes(potentialTopic)) {
      topicChapter = potentialTopic;
    }
  }
  
  return {
    documentTitle,
    chapter: topicChapter,
    pageNumber,
    slideNumber,
    sourceType,
  };
}

/**
 * Check if the citations array indicates no course materials were used
 */
export function isNoCitationMessage(citations: string[]): boolean {
  if (!citations || citations.length === 0) return true;
  
  // Check for explicit "no materials" messages
  const noCitationPhrases = [
    'no course materials',
    'no materials were retrieved',
    'general knowledge',
    'not from course materials',
  ];
  
  return citations.some(citation => 
    noCitationPhrases.some(phrase => 
      citation.toLowerCase().includes(phrase)
    )
  );
}

/**
 * Match a parsed citation to its corresponding retrieved material
 * for displaying content snippets
 */
export function matchMaterialToCitation(
  citation: ParsedCitation, 
  materials: RetrievedMaterial[]
): RetrievedMaterial | null {
  if (!materials || materials.length === 0) return null;
  
  return materials.find(material => {
    // Match by document title
    const titleMatch = material.document_title?.toLowerCase().includes(
      citation.documentTitle.toLowerCase().replace('elec3120 ', '')
    ) || citation.documentTitle.toLowerCase().includes(
      material.document_title?.toLowerCase() || ''
    );
    
    // Match by page number if available
    const pageMatch = !citation.pageNumber || material.page_number === citation.pageNumber;
    
    // Match by chapter if available
    const chapterMatch = !citation.chapter || 
      material.chapter?.toLowerCase().includes(citation.chapter.toLowerCase()) ||
      citation.chapter.toLowerCase().includes(material.chapter?.toLowerCase() || '');
    
    return titleMatch && pageMatch && chapterMatch;
  }) || null;
}

/**
 * Format similarity score as a percentage string
 */
export function formatSimilarity(similarity?: number): string | null {
  if (similarity === undefined || similarity === null) return null;
  return `${Math.round(similarity * 100)}%`;
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '…';
}
