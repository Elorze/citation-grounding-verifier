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

/** Split text into sentences while keeping character offsets. */
export function splitSentences(text: string): SentenceSpan[] {
  if (!text) return [];
  const spans: SentenceSpan[] = [];
  const re = /[^.!?。！？\n]+[.!?。！？]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const leading = raw.length - raw.trimStart().length;
    const start = m.index + leading;
    const end = start + trimmed.length;
    spans.push({ text: trimmed, start, end });
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

/** Tokenize for matching / BM25. CJK → character bigrams; else words. */
export function tokenize(text: string, dropStopwords = true): string[] {
  const lower = text.toLowerCase();
  if (hasCjk(lower)) {
    const chars = [...lower.replace(/\s+/g, '')].filter((c) => /\S/.test(c));
    if (chars.length === 1) return chars;
    const bigrams: string[] = [];
    for (let i = 0; i < chars.length - 1; i++) {
      bigrams.push(chars[i]! + chars[i + 1]!);
    }
    return bigrams;
  }
  const words = lower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!dropStopwords) return words;
  return words.filter((w) => !ENGLISH_STOPWORDS.has(w));
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
