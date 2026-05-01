import Anthropic from '@anthropic-ai/sdk';

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to Vercel → Settings → Environment Variables.');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const MODEL = 'claude-haiku-4-5-20251001';

const FEYNMAN_PROMPT = `Explain the concept below using the Feynman Technique. Plain text only — no markdown, no # * _ or backticks. Use short paragraphs and bullet points (- ). Include one real-world analogy and one example.`;

const GRADE_PROMPT = `Grade the student answer 0-100. Respond ONLY as JSON: {"score":<0-100>,"feedback":"<2 sentences>","gaps":["<gap>"]}`;

const PARSE_PROMPT = `Extract question-answer flashcard pairs from the study material. Respond ONLY as a JSON array: [{"question":"...","answer":"..."}]`;

export async function generateFeynmanExplanation(question, answer) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: FEYNMAN_PROMPT,
    messages: [{ role: 'user', content: `Question: ${question}\nAnswer: ${answer}` }],
  });
  return response.content[0].text;
}

export async function gradeAnswer(question, correctAnswer, userAnswer) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 256,
    system: GRADE_PROMPT,
    messages: [{
      role: 'user',
      content: `Question: ${question}\nCorrect: ${correctAnswer}\nStudent: ${userAnswer}`,
    }],
  });

  const text = response.content[0].text;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* fall through */ }

  return { score: 50, feedback: text.slice(0, 200), gaps: [] };
}

export async function parseWithAI(text) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: PARSE_PROMPT,
    messages: [{ role: 'user', content: text }],
  });

  const raw = response.content[0].text;
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch { /* fall through */ }

  return [];
}
