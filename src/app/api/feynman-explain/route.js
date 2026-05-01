import { NextResponse } from 'next/server';
import { generateFeynmanExplanation } from '@/lib/claude';
import { getCachedExplanation, cacheExplanation } from '@/lib/firebase';
import { checkUsage, CALL_COST } from '@/lib/firebaseAdmin';

async function hashQuestion(question) {
  const encoder = new TextEncoder();
  const data = encoder.encode(question.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(r => setTimeout(() => r(null), ms))]);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { question, answer, topic, uid } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 });
    }

    // Check Firestore cache first (cached responses don't count against budget)
    let questionHash = null;
    let cached = null;
    try {
      questionHash = await hashQuestion(question);
      cached = await withTimeout(getCachedExplanation(questionHash), 3000);
    } catch { /* cache unavailable */ }

    if (cached?.explanation) {
      return NextResponse.json({ explanation: cached.explanation, cached: true });
    }

    // Check monthly usage budget before calling Claude
    const usage = await checkUsage(uid, CALL_COST.feynman);
    if (!usage.ok) {
      return NextResponse.json(
        { error: `Monthly AI limit reached ($1.00/month). You've used $${usage.spent.toFixed(2)} this month.` },
        { status: 429 }
      );
    }

    const explanation = await generateFeynmanExplanation(question, answer, topic);

    // Cache result (fire-and-forget)
    if (questionHash) {
      withTimeout(cacheExplanation(questionHash, { question, answer, topic: topic || '', explanation }), 3000)
        .catch(() => {});
    }

    return NextResponse.json({ explanation, cached: false });
  } catch (error) {
    const msg = error?.message || 'Failed to generate explanation.';
    console.error('Feynman explain error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
