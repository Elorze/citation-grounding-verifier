const ENGLISH_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'as',
  'by',
  'with',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'not',
  'no',
  'nor',
  'so',
  'if',
  'then',
  'than',
  'too',
  'very',
  'can',
  'could',
  'should',
  'would',
  'may',
  'might',
  'will',
  'just',
]);

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

/** Protect common abbreviations so "a.m." / "Dr." do not split sentences. */
function maskAbbreviations(text: string): { masked: string; restore: (s: string) => string } {
  const placeholders: string[] = [];
  const masked = text.replace(
    /\b(?:a\.m|p\.m|mr|mrs|ms|dr|prof|vs|etc|approx)\./gi,
    (m) => {
      const i = placeholders.length;
      placeholders.push(m);
      return `__ABBR${i}__`;
    },
  );
  return {
    masked,
    restore: (s) => s.replace(/__ABBR(\d+)__/g, (_, n) => placeholders[Number(n)] ?? _),
  };
}

/** Split text into sentences while keeping character offsets. */
export function splitSentences(text: string): SentenceSpan[] {
  if (!text) return [];
  const { masked, restore } = maskAbbreviations(text);
  const spans: SentenceSpan[] = [];
  const re = /[^.!?。！？\n]+[.!?。！？]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const raw = m[0];
    const trimmedMasked = raw.trim();
    if (!trimmedMasked) continue;
    const leading = raw.length - raw.trimStart().length;
    const start = m.index + leading;
    const end = start + trimmedMasked.length;
    const restored = restore(trimmedMasked);
    // Map offsets back onto the original string via restored length at start.
    const prefixRestored = restore(masked.slice(0, start));
    const origStart = prefixRestored.length;
    spans.push({
      text: restored,
      start: origStart,
      end: origStart + restored.length,
    });
  }
  if (spans.length === 0 && text.trim()) {
    const trimmed = text.trim();
    const start = text.indexOf(trimmed);
    spans.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return spans;
}

export function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}

function cjkBigrams(chars: string[]): string[] {
  if (chars.length === 0) return [];
  if (chars.length === 1) return chars;
  const bigrams: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    bigrams.push(chars[i]! + chars[i + 1]!);
  }
  return bigrams;
}

/**
 * Tokenize for matching / BM25.
 * Mixed scripts: Latin/digits as words, CJK runs as character bigrams
 * (avoids exploding "Hillcrest" into letter-bigrams that dilute Jaccard).
 */
export function tokenize(text: string, dropStopwords = true): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  // Latin/num words OR contiguous CJK (Han + kana + compat ideographs)
  const re =
    /[a-z0-9]+(?:'[a-z]+)?|[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;
  let m: RegExpExecArray | null;
  let sawAny = false;
  while ((m = re.exec(lower)) !== null) {
    sawAny = true;
    const piece = m[0]!;
    if (hasCjk(piece)) {
      tokens.push(...cjkBigrams([...piece]));
    } else if (!dropStopwords || !ENGLISH_STOPWORDS.has(piece)) {
      tokens.push(piece);
    }
  }
  if (!sawAny) {
    // Fallback for odd punctuation-only strings
    const words = lower
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    return dropStopwords
      ? words.filter((w) => !ENGLISH_STOPWORDS.has(w))
      : words;
  }
  return tokens;
}

/** Strip punctuation/whitespace for containment checks in claim matching. */
export function normalizeClaimKey(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function contentTokens(text: string): string[] {
  return tokenize(text, true);
}
