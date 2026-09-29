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
    const { prompt } = JSON.parse(event.body || '{}');
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return jsonResponse(400, { error: 'Describe the background music you want.' });
    }
    if (prompt.length > 500) {
      return jsonResponse(400, { error: 'Keep the music description under 500 characters.' });
    }

    const interaction = await ai.interactions.create({
      model: 'lyria-3-clip-preview',
      input: `Create a 30-second instrumental background music clip for narration. No vocals, lyrics, or sound effects. Keep the arrangement unobtrusive and loop-friendly. Direction: ${prompt.trim()}`,
      response_format: { type: 'audio' },
    });
    const audio = interaction.output_audio;
    if (!audio?.data) {
      return jsonResponse(502, { error: 'The music model did not return an audio clip.' });
    }

    return jsonResponse(200, {
      audioBase64: audio.data,
      mimeType: audio.mime_type || 'audio/mp3',
      title: interaction.output_text || 'AI background music',
    });
  } catch (error: any) {
    console.error('Error generating background music:', error);
    return jsonResponse(500, { error: error?.message || 'Failed to generate background music.' });
  }
}