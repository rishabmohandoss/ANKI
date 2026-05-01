import { NextResponse } from 'next/server';
import { gradeAnswer } from '@/lib/claude';
import { checkUsage, CALL_COST } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { question, correctAnswer, userAnswer, uid } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json({ error: 'Question and correct answer are required.' }, { status: 400 });
    }

    if (!userAnswer || userAnswer.trim().length === 0) {
      return NextResponse.json({
        score: 0,
        feedback: 'No answer provided. Try typing what you know — even partial knowledge helps!',
        gaps: ['No answer submitted'],
      });
    }

    const usage = await checkUsage(uid, CALL_COST.grading);
    if (!usage.ok) {
      return NextResponse.json(
        { error: `Monthly AI limit reached ($1.00/month).` },
        { status: 429 }
      );
    }

    const result = await gradeAnswer(question, correctAnswer, userAnswer);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error?.message || 'Failed to grade answer.';
    console.error('Grade answer error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
