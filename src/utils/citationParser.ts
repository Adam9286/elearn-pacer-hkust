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

/**
 * Get the content from a retrieved material, normalizing between 'excerpt' and 'content' fields
 * n8n returns 'excerpt', but older code may use 'content'
 */
export function getMaterialContent(material: RetrievedMaterial | null | undefined): string {
  if (!material) return '';
  return material.excerpt || material.content || '';
}

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
 * Format lecture name from document title or material metadata
 * "10-IP.pdf" -> "Lecture 10: IP"
 * "Course Material" -> Try to extract from source_url
 */
export function formatLectureName(docTitle: string, material?: RetrievedMaterial | null): string {
  // If generic title, try to extract from material filename
  if (!docTitle || docTitle === 'Course Material' || docTitle === 'Unknown Source') {
    const filename = material?.source_url || '';
    const lectureMatch = filename.match(/(\d+)-([^.]+)/);
    if (lectureMatch) {
      return `Lecture ${parseInt(lectureMatch[1])}: ${lectureMatch[2].replace(/_/g, ' ')}`;
    }
  }
  
  // Check if it's already formatted with lecture
  if (docTitle.toLowerCase().includes('lecture')) {
    return docTitle;
  }
  
  // Check for textbook
  if (docTitle.toLowerCase().includes('textbook')) {
    return 'Textbook';
  }
  
  return docTitle;
}
