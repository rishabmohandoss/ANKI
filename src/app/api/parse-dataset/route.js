import { NextResponse } from 'next/server';
import {
  detectFormat,
  parseJSON,
  parseCSV,
  parsePlainText,
  parseQA,
  parseColonPairs,
  extractTopics,
} from '@/lib/parsers';
import { parseWithAI } from '@/lib/claude';

export async function POST(request) {
  try {
    const body = await request.json();
    const { content, format: requestedFormat } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const format = requestedFormat || detectFormat(content);
    let cards = [];

    switch (format) {
      case 'json':      cards = parseJSON(content);       break;
      case 'csv':       cards = parseCSV(content);        break;
      case 'plaintext': cards = parsePlainText(content);  break;
      case 'qa':        cards = parseQA(content);         break;
      case 'colons':    cards = parseColonPairs(content); break;
      default:
        // Last resort — hand off to Claude (Haiku)
        cards = await parseWithAI(content);
    }

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'Could not parse any question-answer pairs from the provided content.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      cards,
      topics: extractTopics(cards),
      format,
      count: cards.length,
    });
  } catch (error) {
    const msg = error?.message || 'Failed to parse dataset.';
    console.error('Parse dataset error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
