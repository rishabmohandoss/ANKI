import { NextResponse } from 'next/server';
import { generateFeynmanExplanation } from '@/lib/claude';
import { getCachedExplanation, cacheExplanation } from '@/lib/firebase';

async function hashQuestion(question) {
  const encoder = new TextEncoder();
  const data = encoder.encode(question.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Wrap any promise with a timeout — returns null on timeout instead of hanging.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
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

    // Try Firestore cache — skip if Firebase isn't configured or is slow
    let cached = null;
    let questionHash = null;
    try {
      questionHash = await hashQuestion(question);
      cached = await withTimeout(getCachedExplanation(questionHash), 3000);
    } catch { /* cache unavailable — proceed without it */ }

    if (cached?.explanation) {
      return NextResponse.json({ explanation: cached.explanation, cached: true });
    }

    // Generate explanation with Claude
    const explanation = await generateFeynmanExplanation(question, answer, topic);

    // Write to cache in the background — don't block the response
    if (questionHash) {
      withTimeout(
        cacheExplanation(questionHash, { question, answer, topic: topic || '', explanation }),
        3000
      ).catch(() => {});
    }

    return NextResponse.json({ explanation, cached: false });
  } catch (error) {
    const msg = error?.message || String(error) || 'Failed to generate explanation.';
    console.error('Feynman explain error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
