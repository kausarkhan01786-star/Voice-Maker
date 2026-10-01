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

const audioCache = new Map<string, {
  audioBase64: string;
  mimeType: string;
  voice: string;
  modelUsed: string;
}>();

function jsonResponse(statusCode: number, payload: Record<string, unknown>): NetlifyResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  };
}

async function generateAudio(model: string, text: string, voice: string, style: string) {
  const voiceConfig = voice.startsWith('voicekey_') || voice.startsWith('voice_')
    ? { voice }
    : { prebuiltVoiceConfig: { voiceName: voice } };
  return ai!.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [{ text, speechMetadata: { style } }],
    }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig,
      },
    },
  });
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }
  if (!ai) {
    return jsonResponse(503, { error: 'Gemini API is not configured. Add GEMINI_API_KEY in Netlify environment variables.' });
  }

  try {
    const { text, voice = 'Kore', style = 'Warm, natural, friendly and authentic conversational tone' } = JSON.parse(event.body || '{}');
    if (!text || typeof text !== 'string' || !text.trim()) {
      return jsonResponse(400, { error: 'Text prompt is required.' });
    }

    const validVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
    const isReplicatedVoice = typeof voice === 'string' && /^voice(?:key)?_[a-zA-Z0-9_-]+$/.test(voice);
    const selectedVoice = validVoices.includes(voice) || isReplicatedVoice ? voice : 'Kore';
    const cacheKey = `${selectedVoice}::${text.trim()}::${style}`;
    const cached = audioCache.get(cacheKey);
    if (cached) return jsonResponse(200, { ...cached, cached: true });

    let response;
    let modelUsed = 'gemini-3.8-flash-tts';
    try {
      response = await generateAudio(modelUsed, text.trim(), selectedVoice, style);
    } catch (error: any) {
      const isQuotaError = error?.status === 429 || /429|quota|RESOURCE_EXHAUSTED/i.test(error?.message || '');
      if (!isQuotaError) throw error;

      modelUsed = 'gemini-3.8-flash-lite-tts';
      try {
        response = await generateAudio(modelUsed, text.trim(), selectedVoice, style);
      } catch (fallbackError: any) {
        const retryMatch = `${error?.message || ''} ${fallbackError?.message || ''}`.match(/retry in ([0-9.]+)s/i);
        return jsonResponse(429, {
          error: 'Gemini TTS request limit reached. Please wait and try again.',
          isQuotaExceeded: true,
          retrySeconds: retryMatch ? Math.ceil(Number(retryMatch[1])) : 60,
          canUseBrowserSpeech: true,
        });
      }
    }

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) return jsonResponse(500, { error: 'No audio data received from Gemini TTS model.' });

    const payload = { audioBase64, mimeType: 'audio/wav', voice: selectedVoice, modelUsed };
    if (audioCache.size >= 100) audioCache.delete(audioCache.keys().next().value!);
    audioCache.set(cacheKey, payload);
    return jsonResponse(200, payload);
  } catch (error: any) {
    console.error('Error generating speech with TTS:', error);
    return jsonResponse(500, { error: error?.message || 'Failed to generate speech with TTS.' });
  }
}