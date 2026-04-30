/**
 * Dataset format parsers for JSON, CSV, and plain text.
 */

/**
 * Detect the format of input text.
 * @param {string} text - Raw input text
 * @returns {'json' | 'csv' | 'plaintext' | 'unknown'}
 */
export function detectFormat(text) {
  const trimmed = text.trim();

  // Check for JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return 'json';
    } catch { /* not valid JSON */ }
  }

  // Check for CSV (has header row with common column names)
  const firstLine = trimmed.split('\n')[0].toLowerCase();
  if (
    (firstLine.includes('question') && firstLine.includes('answer')) ||
    (firstLine.includes(',') && trimmed.split('\n').length > 1)
  ) {
    return 'csv';
  }

  // Check for plain text delimiter
  if (trimmed.includes('|||')) {
    return 'plaintext';
  }

  return 'unknown';
}

/**
 * Parse a JSON array of Q&A objects.
 * Supports: [{question, answer}] or [{q, a}] or [{front, back}]
 */
export function parseJSON(text) {
  try {
    const data = JSON.parse(text.trim());
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => ({
        question: item.question || item.q || item.front || item.term || '',
        answer: item.answer || item.a || item.back || item.definition || '',
      }))
      .filter((card) => card.question && card.answer);
  } catch {
    return [];
  }
}

/**
 * Parse CSV text with question/answer columns.
 * Handles quoted fields and common delimiters.
 */
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Parse header
  const headers = parsCSVLine(firstLine, delimiter).map((h) =>
    h.toLowerCase().trim()
  );
  const qIdx = headers.findIndex(
    (h) => h === 'question' || h === 'q' || h === 'front' || h === 'term'
  );
  const aIdx = headers.findIndex(
    (h) => h === 'answer' || h === 'a' || h === 'back' || h === 'definition'
  );

  if (qIdx === -1 || aIdx === -1) {
    // Fallback: assume first column = question, second = answer
    return lines.slice(1).map((line) => {
      const cols = parsCSVLine(line, delimiter);
      return { question: cols[0] || '', answer: cols[1] || '' };
    }).filter((c) => c.question && c.answer);
  }

  return lines
    .slice(1)
    .map((line) => {
      const cols = parsCSVLine(line, delimiter);
      return { question: cols[qIdx] || '', answer: cols[aIdx] || '' };
    })
    .filter((card) => card.question && card.answer);
}

/**
 * Parse a single CSV line, respecting quoted fields.
 */
function parsCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse plain text with ||| delimiter.
 * Format: question|||answer (one per line)
 */
export function parsePlainText(text) {
  return text
    .trim()
    .split('\n')
    .map((line) => {
      const parts = line.split('|||');
      if (parts.length >= 2) {
        return {
          question: parts[0].trim(),
          answer: parts.slice(1).join('|||').trim(),
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Extract topics from a set of cards using simple keyword extraction.
 */
export function extractTopics(cards) {
  const wordFreq = {};
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'which', 'who',
    'how', 'when', 'where', 'why', 'of', 'in', 'to', 'for', 'with', 'on',
    'at', 'by', 'from', 'it', 'this', 'that', 'and', 'or', 'not', 'be',
    'do', 'does', 'did', 'has', 'have', 'had', 'can', 'could', 'will',
    'would', 'should', 'may', 'might', 'must', 'shall',
  ]);

  cards.forEach((card) => {
    const text = `${card.question} ${card.answer}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    words.forEach((word) => {
      if (!stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
