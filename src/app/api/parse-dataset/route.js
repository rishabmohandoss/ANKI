import { NextResponse } from 'next/server';
import { detectFormat, parseJSON, parseCSV, parsePlainText, extractTopics } from '@/lib/parsers';
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
      case 'json':
        cards = parseJSON(content);
        break;
      case 'csv':
        cards = parseCSV(content);
        break;
      case 'plaintext':
        cards = parsePlainText(content);
        break;
      case 'unknown':
      default:
        // Use Claude to intelligently parse unstructured text
        cards = await parseWithAI(content);
        break;
    }

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'Could not parse any question-answer pairs from the provided content.' },
        { status: 422 }
      );
    }

    const topics = extractTopics(cards);

    return NextResponse.json({
      cards,
      topics,
      format,
      count: cards.length,
    });
  } catch (error) {
    console.error('Parse dataset error:', error);
    return NextResponse.json(
      { error: 'Failed to parse dataset. Please check the format and try again.' },
      { status: 500 }
    );
  }
}
