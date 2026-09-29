import { GoogleGenAI } from '@google/genai';

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

type NetlifyResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })
  : null;

function jsonResponse(statusCode: number, payload: Record<string, unknown>): NetlifyResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  };
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }
  if (!ai) {
    return jsonResponse(503, { error: 'Gemini API is not configured. Add GEMINI_API_KEY in Netlify environment variables.' });
  }

  try {
    const { question, userContext = 'A user exploring voice synthesis, voiceovers, podcasts, and speech generation' } = JSON.parse(event.body || '{}');
    if (!question || typeof question !== 'string') {
      return jsonResponse(400, { error: 'Question is required.' });
    }

    const prompt = `You are an expert Voice Studio Copilot and AI speech assistant for VoiceMack (powered by Gemini 3.8 Flash TTS).

Context: ${userContext}
User's Question/Request: "${question}"

Provide an articulate, helpful, and concise response in English (under 150 words) suitable for reading aloud via Text-to-Speech:
1. Direct, engaging answer or voiceover script.
2. Practical voice delivery tips (pacing, tone, where to pause, recommended emotion).
3. If writing a script, include natural punctuation and optional voice bursts like |mhm|, |yeah|, <laugh>, or <breath> to highlight Gemini 3.8 Flash TTS capabilities.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return jsonResponse(200, { answer: response.text || '' });
  } catch (error: any) {
    console.error('Error getting assistant response:', error);
    return jsonResponse(500, { error: error?.message || 'Failed to get voice assistant response.' });
  }
}