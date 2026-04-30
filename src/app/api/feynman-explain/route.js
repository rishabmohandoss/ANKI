import { NextResponse } from 'next/server';
import { generateFeynmanExplanation } from '@/lib/claude';
import { getCachedExplanation, cacheExplanation } from '@/lib/firebase';

/**
 * Generate a hash for cache key.
 */
async function hashQuestion(question) {
  const encoder = new TextEncoder();
  const data = encoder.encode(question.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { question, answer, topic } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required.' },
        { status: 400 }
      );
    }

    // Check Firestore cache first
    const questionHash = await hashQuestion(question);
    const cached = await getCachedExplanation(questionHash);

    if (cached) {
      return NextResponse.json({
        explanation: cached.explanation,
        cached: true,
      });
    }

    // Generate fresh explanation via Claude
    const explanation = await generateFeynmanExplanation(question, answer, topic);

    // Cache in Firestore for future requests
    await cacheExplanation(questionHash, {
      question,
      answer,
      topic: topic || '',
      explanation,
    });

    return NextResponse.json({
      explanation,
      cached: false,
    });
  } catch (error) {
    console.error('Feynman explain error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation. Please try again.' },
      { status: 500 }
    );
  }
}
