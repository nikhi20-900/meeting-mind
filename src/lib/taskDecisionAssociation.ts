import { ExtractedDecision } from "@/types/extraction";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "when", "from", "this", "that", "into", "their", "your",
  "production", "access", "engineers", "contractors", "hardware", "keys",
]);

function meaningfulWords(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter(
    (word) => word.length > 2 && !STOP_WORDS.has(word)
  ) || [];
}

/** Link only when a task has a clear, specific wording match to one decision. */
export function findTaskDecisionAssociation(
  taskTitle: string,
  decisions: ExtractedDecision[]
): ExtractedDecision | undefined {
  const taskWords = new Set(meaningfulWords(taskTitle));
  const ranked = decisions
    .map((decision) => ({
      decision,
      overlap: meaningfulWords(decision.decisionText).filter((word) => taskWords.has(word)).length,
    }))
    .filter((candidate) => candidate.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap);

  if (ranked.length === 0 || (ranked.length > 1 && ranked[0].overlap === ranked[1].overlap)) {
    return undefined;
  }
  return ranked[0].decision;
}
