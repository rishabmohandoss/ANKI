import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default to Haiku for cost efficiency
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const SMART_MODEL = 'claude-sonnet-4-6';

// ─── Prompt Templates ────────────────────────────────────────────

const FEYNMAN_SYSTEM_PROMPT = `You are a brilliant tutor who explains concepts using the Feynman Technique. 
Your goal is to make complex topics simple and intuitive.

Rules:
- Use simple, jargon-free language
- Use bullet points and short paragraphs (max 3-4 lines each)
- Include a real-world analogy
- Give one practical example
- Never use overly technical language unless you immediately explain it
- Be encouraging and conversational`;

const GRADE_SYSTEM_PROMPT = `You are an intelligent grading assistant. Evaluate the student's answer against the correct answer.

Rules:
- Score from 0-100 based on accuracy and completeness
- Be encouraging but honest
- Identify specific gaps or misconceptions
- Suggest what to review
- Keep feedback concise (2-3 sentences max)

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "feedback": "<2-3 sentence feedback>",
  "gaps": ["<gap1>", "<gap2>"]
}`;

const PARSE_SYSTEM_PROMPT = `You are a study material parser. Extract question-answer pairs from the given text.
The text may be lecture notes, study guides, or any educational content.

Rules:
- Extract clear, atomic question-answer pairs
- Each question should test one concept
- Answers should be concise but complete
- Generate 5-20 pairs depending on content length

Respond ONLY with a valid JSON array:
[{"question": "...", "answer": "..."}]`;

// ─── API Functions ───────────────────────────────────────────────

/**
 * Generate a Feynman-style explanation for a concept.
 */
export async function generateFeynmanExplanation(question, answer, topic = '') {
  const userMessage = `Explain this concept using the Feynman Technique:

Question: ${question}
Answer: ${answer}
${topic ? `Topic/Subject: ${topic}` : ''}

Give a clear, simple explanation that a student could use to deeply understand this concept.`;

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 600,
    system: FEYNMAN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content[0].text;
}

/**
 * Grade a student's answer against the correct answer.
 */
export async function gradeAnswer(question, correctAnswer, userAnswer) {
  const userMessage = `Grade this student's answer:

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}`;

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 300,
    system: GRADE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;

  // Parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse grading response:', e);
  }

  // Fallback if JSON parsing fails
  return {
    score: 50,
    feedback: text.slice(0, 200),
    gaps: [],
  };
}

/**
 * Parse messy/unstructured text into Q&A pairs using Claude.
 */
export async function parseWithAI(text) {
  const response = await client.messages.create({
    model: SMART_MODEL, // Use Sonnet for complex parsing
    max_tokens: 2000,
    system: PARSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Parse the following study material into question-answer flashcards:\n\n${text}` }],
  });

  const responseText = response.content[0].text;

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  return [];
}
