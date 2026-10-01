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

let ai: GoogleGenAI | null | undefined;

function getAI(): GoogleGenAI | null {
  if (ai !== undefined) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      })
    : null;
  return ai;
}

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
  const gemini = getAI();
  if (!gemini) {
    return jsonResponse(503, { error: 'Gemini API is not configured.' });
  }

  try {
    const { name, sourceAudioBase64, consentAudioBase64 } = JSON.parse(event.body || '{}');
    if (typeof name !== 'string' || !name.trim() || name.length > 48) {
      return jsonResponse(400, { error: 'Voice name must be 1-48 characters.' });
    }
    if (typeof sourceAudioBase64 !== 'string' || typeof consentAudioBase64 !== 'string') {
      return jsonResponse(400, { error: 'Upload a voice sample and record its consent statement.' });
    }
    if (sourceAudioBase64.length > 2_500_000 || consentAudioBase64.length > 2_500_000) {
      return jsonResponse(413, { error: 'Normalized voice recordings are too large. Keep the sample between 10 and 30 seconds.' });
    }

    const replicatedVoice = await gemini.voices.create({
      store: false,
      voice: {
        model: 'gemini-3.8-flash-tts',
        type: 'replicated',
        replicated: {
          source_audio: { mime_type: 'audio/wav', data: sourceAudioBase64 },
          consent_audio: { mime_type: 'audio/wav', data: consentAudioBase64 },
        },
      },
    });
    if (!replicatedVoice.key) {
      return jsonResponse(502, { error: 'Gemini did not return a replicated voice key.' });
    }

    return jsonResponse(200, {
      voiceKey: replicatedVoice.key,
      name: name.trim(),
      expiresAt: replicatedVoice.expire_time
        ? Date.parse(replicatedVoice.expire_time)
        : Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  } catch (error: any) {
    console.error('Voice replication error:', error);
    return jsonResponse(error?.status === 503 ? 503 : 500, {
      error: error?.message || 'Could not create the replicated voice. Check consent audio and Gemini access.',
    });
  }
}