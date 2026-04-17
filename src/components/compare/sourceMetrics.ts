import type { RetrievedMaterial } from '@/types/chatTypes';
import {
  buildCitationFromMaterial,
  getCitationDedupeKey,
  isNoCitationMessage,
  matchMaterialToCitation,
  parseCitation,
} from '@/utils/citationParser';

export function getEffectiveSourceCount(
  citations?: string[],
  retrievedMaterials: RetrievedMaterial[] = [],
) {
  const citationStrings = Array.isArray(citations)
    ? citations.filter((citation): citation is string => typeof citation === 'string')
    : [];

  const hasCitations = citationStrings.length > 0 && !isNoCitationMessage(citationStrings);

  const parsedCitations = hasCitations
    ? citationStrings.map((raw) => {
        const parsed = parseCitation(raw);
        const material = matchMaterialToCitation(parsed, retrievedMaterials);
        return { parsed, material };
      })
    : [];

  const matchedMaterialIds = new Set(
    parsedCitations
      .filter((citation) => citation.material)
      .map((citation) => {
        const material = citation.material!;
        return `${material.document_title || ''}-${material.page_number ?? ''}-${material.slide_number ?? ''}`;
      }),
  );

  const unmatchedMaterials = retrievedMaterials.filter((material) => {
    if (!material || !material.document_title) return false;
    const key = `${material.document_title}-${material.page_number ?? ''}-${material.slide_number ?? ''}`;
    return !matchedMaterialIds.has(key);
  });

  const unmatchedCards = unmatchedMaterials.map((material) => ({
    parsed: buildCitationFromMaterial(material),
    material,
  }));

  const combinedCards = [...parsedCitations, ...unmatchedCards];
  const seenKeys = new Set<string>();

  return combinedCards.filter((card) => {
    const key = getCitationDedupeKey(card.parsed, card.material);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  }).length;
}
