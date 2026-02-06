import { ParsedCitation, RetrievedMaterial } from '@/types/chatTypes';

/**
 * Parse a raw citation string into structured data
 * @example
 * Input:  "- **Source**: ELEC3120 Textbook (Page 199) [Textbook]"
 * Output: { documentTitle: "ELEC3120 Textbook", pageNumber: 199, sourceType: "textbook" }
 * 
 * Also handles:
 *   "- ELEC3120 Textbook, Chapter 3: Transport Layer, Page 199 (LOCAL_UPLOAD)"
 *   "- **Source**: 01-Introduction (Page N/A) [Lecture Slides]"
 */
export function parseCitation(raw: string): ParsedCitation {
  // Remove leading dash, bold markdown, "Source:" prefix, and trim
  let cleaned = raw
    .replace(/^-\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^Source:\s*/i, '')
    .trim();
  
  // Remove the source indicator suffix like (LOCAL_UPLOAD) or [Lecture Slides]
  const bracketTypeMatch = cleaned.match(/\[(Textbook|Lecture Slides|Lecture|Unknown)\]\s*$/i);
  const bracketType = bracketTypeMatch?.[1]?.toLowerCase();
  cleaned = cleaned.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  
  // Remove trailing parenthetical like (LOCAL_UPLOAD)
  cleaned = cleaned.replace(/\s*\([^)]*UPLOAD[^)]*\)\s*$/i, '').trim();
  
  // Extract page number from parenthetical like (Page 199)
  const parenPageMatch = cleaned.match(/\(Page\s*(\d+)\)/i);
  const parenPage = parenPageMatch ? parseInt(parenPageMatch[1], 10) : undefined;
  cleaned = cleaned.replace(/\s*\(Page\s*\d+\)/i, '').trim();
  
  // Remove "(Page N/A)" style
  cleaned = cleaned.replace(/\s*\(Page\s*N\/A\)/i, '').trim();
  
  // Extract slide number from parenthetical like (Slide 5)
  const parenSlideMatch = cleaned.match(/\(Slide\s*(\d+)\)/i);
  const parenSlide = parenSlideMatch ? parseInt(parenSlideMatch[1], 10) : undefined;
  cleaned = cleaned.replace(/\s*\(Slide\s*\d+\)/i, '').trim();

  // Split by comma to get parts
  const parts = cleaned.split(',').map(p => p.trim());
  
  // Extract document title (first part)
  const documentTitle = parts[0] || 'Unknown Source';
  
  // Determine source type from bracket suffix, title, or fallback
  let sourceType: 'textbook' | 'lecture' | 'unknown';
  if (bracketType?.includes('textbook')) {
    sourceType = 'textbook';
  } else if (bracketType?.includes('lecture')) {
    sourceType = 'lecture';
  } else if (documentTitle.toLowerCase().includes('textbook')) {
    sourceType = 'textbook';
  } else if (documentTitle.toLowerCase().includes('lecture') || documentTitle.match(/^\d+-/)) {
    sourceType = 'lecture';
  } else {
    sourceType = 'unknown';
  }
  
  // Find chapter (contains "Chapter" keyword)
  const chapterPart = parts.find(p => p.toLowerCase().includes('chapter'));
  const chapter = chapterPart || undefined;
  
  // Find page number (from inline text or parenthetical)
  // Reject "N/A" strings explicitly
  const pagePart = parts.find(p => /page\s*\d+/i.test(p) && !/page\s*N\/A/i.test(p));
  const pageMatch = pagePart?.match(/page\s*(\d+)/i);
  const parsedPage = pageMatch ? parseInt(pageMatch[1], 10) : parenPage;
  // Ensure we don't return NaN or invalid values
  const pageNumber = parsedPage && !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : undefined;
  
  // Find slide number (from inline text or parenthetical)
  // Reject "N/A" strings explicitly
  const slidePart = parts.find(p => /slide\s*\d+/i.test(p) && !/slide\s*N\/A/i.test(p));
  const slideMatch = slidePart?.match(/slide\s*(\d+)/i);
  const parsedSlide = slideMatch ? parseInt(slideMatch[1], 10) : parenSlide;
  // Ensure we don't return NaN or invalid values
  const slideNumber = parsedSlide && !isNaN(parsedSlide) && parsedSlide > 0 ? parsedSlide : undefined;
  
  // If no chapter found, try to get topic from remaining parts (for lecture notes)
  let topicChapter = chapter;
  if (!topicChapter && parts.length > 1) {
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
 * Build a ParsedCitation directly from a RetrievedMaterial object.
 * Used when we have materials but no matching citation string.
 */
export function buildCitationFromMaterial(material: RetrievedMaterial): ParsedCitation {
  const isTextbook = material.source_type === 'Textbook' || 
    material.document_title?.toLowerCase().includes('textbook');

  // Ensure page_number and slide_number are valid numbers (not "N/A", null, or invalid)
  const pageNum = material.page_number;
  const slideNum = material.slide_number;
  const validPageNum = pageNum && pageNum !== 'N/A' && !isNaN(Number(pageNum)) && Number(pageNum) > 0 
    ? Number(pageNum) 
    : undefined;
  const validSlideNum = slideNum && slideNum !== 'N/A' && !isNaN(Number(slideNum)) && Number(slideNum) > 0 
    ? Number(slideNum) 
    : undefined;

  return {
    documentTitle: material.lecture_title || material.document_title || 'Course Material',
    chapter: material.chapter || undefined,
    pageNumber: validPageNum,
    slideNumber: validSlideNum,
    sourceType: isTextbook ? 'textbook' : 'lecture',
  };
}

/**
 * Check if the citations array indicates no course materials were used.
 * Handles both string[] and mixed arrays (e.g. objects from API) safely.
 */
export function isNoCitationMessage(citations: string[] | unknown[]): boolean {
  if (!citations || citations.length === 0) return true;

  const noCitationPhrases = [
    'no course materials',
    'no materials were retrieved',
    'general knowledge',
    'not from course materials',
    'no specific lecture slides were retrieved',
  ];

  return citations.some((item) => {
    if (typeof item !== 'string') return false; // non-string = real citation payload, not a "no citation" message
    return noCitationPhrases.some((phrase) =>
      item.toLowerCase().includes(phrase)
    );
  });
}

/**
 * Match a parsed citation to its corresponding retrieved material.
 * Uses multiple strategies: lecture_id, slide_number, page_number, title, chapter.
 */
export function matchMaterialToCitation(
  citation: ParsedCitation, 
  materials: RetrievedMaterial[]
): RetrievedMaterial | null {
  if (!materials || materials.length === 0) return null;
  
  // Strategy 1: Exact slide match for lecture materials
  if (citation.slideNumber) {
    const slideMatch = materials.find(m => 
      m.slide_number === citation.slideNumber && (
        // Title should also loosely match
        !citation.documentTitle || 
        citation.documentTitle === 'Unknown Source' ||
        m.document_title?.toLowerCase().includes(citation.documentTitle.toLowerCase().replace('elec3120 ', '')) ||
        m.lecture_title?.toLowerCase().includes(citation.documentTitle.toLowerCase()) ||
        citation.documentTitle.toLowerCase().includes(m.document_title?.toLowerCase() || '')
      )
    );
    if (slideMatch) return slideMatch;
  }

  // Strategy 2: Exact page + chapter match for textbook
  if (citation.pageNumber && citation.sourceType === 'textbook') {
    const pageChapterMatch = materials.find(m => 
      m.page_number === citation.pageNumber && 
      m.source_type === 'Textbook'
    );
    if (pageChapterMatch) return pageChapterMatch;
  }

  // Strategy 3: Title + page number match
  if (citation.pageNumber) {
    const titlePageMatch = materials.find(m => {
      const titleMatch = m.document_title?.toLowerCase().includes(
        citation.documentTitle.toLowerCase().replace('elec3120 ', '')
      ) || citation.documentTitle.toLowerCase().includes(
        m.document_title?.toLowerCase() || ''
      );
      return titleMatch && m.page_number === citation.pageNumber;
    });
    if (titlePageMatch) return titlePageMatch;
  }

  // Strategy 4: Broad title + chapter match
  return materials.find(material => {
    const titleMatch = material.document_title?.toLowerCase().includes(
      citation.documentTitle.toLowerCase().replace('elec3120 ', '')
    ) || citation.documentTitle.toLowerCase().includes(
      material.document_title?.toLowerCase() || ''
    ) || (material.lecture_title && citation.documentTitle.toLowerCase().includes(
      material.lecture_title.toLowerCase()
    ));
    
    const pageMatch = !citation.pageNumber || material.page_number === citation.pageNumber;
    
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
 * Get the content from a retrieved material, normalizing between 'excerpt' and 'content' fields.
 * n8n returns 'excerpt', but older code may use 'content'.
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
  
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  if (trimmed.includes('"pageContent"') || trimmed.includes('"metadata"')) return false;
  if (trimmed.includes('"source":') || trimmed.includes('"has_ocr"')) return false;
  
  if (trimmed.length < 20) return false;
  
  return true;
}

/**
 * Format lecture name from document title or material metadata.
 * Prefers lecture_title from material if available.
 * "10-IP.pdf" -> "Lecture 10: IP"
 */
export function formatLectureName(docTitle: string, material?: RetrievedMaterial | null): string {
  // If material has lecture_title, prefer that
  if (material?.lecture_title) {
    return material.lecture_title;
  }

  // If generic title, try to extract from material filename or source_url
  if (!docTitle || docTitle === 'Course Material' || docTitle === 'Unknown Source' || docTitle === 'ELEC3120 Material') {
    const filename = material?.source_url || material?.document_title || '';
    const lectureMatch = filename.match(/(\d+)-([^.]+)/);
    if (lectureMatch) {
      return `Lecture ${parseInt(lectureMatch[1])}: ${lectureMatch[2].replace(/_/g, ' ')}`;
    }
    // If we have a lecture_id, use it
    if (material?.lecture_id) {
      return material.lecture_id;
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
  
  // Check for numbered format like "01-Introduction"
  const numMatch = docTitle.match(/^(\d+)-(.+)$/);
  if (numMatch) {
    return `Lecture ${parseInt(numMatch[1])}: ${numMatch[2].replace(/[_-]/g, ' ')}`;
  }
  
  return docTitle;
}

/**
 * Label for collapsed source list only: "lecture number, then the name" (e.g. "15-LAN_Routing").
 * Used in Sources list; expanded view shows full details.
 */
export function getCollapsedSourceLabel(
  citation: { documentTitle: string; sourceType?: string; pageNumber?: number },
  material?: RetrievedMaterial | null
): string {
  const docTitle = material?.document_title ?? citation.documentTitle;
  const isTextbook = material?.source_type === 'Textbook' || citation.sourceType === 'textbook';

  if (isTextbook) {
    const page = material?.page_number ?? citation.pageNumber;
    return page != null && !isNaN(Number(page)) ? `Textbook (Page ${page})` : 'Textbook';
  }

  // Lecture: prefer "NN-Name" format (e.g. 15-LAN_Routing)
  if (docTitle && /^\d+-.+/.test(docTitle)) return docTitle;
  if (material?.lecture_id) return material.lecture_id;
  return docTitle || 'Lecture';
}
