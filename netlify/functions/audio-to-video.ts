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
    return jsonResponse(503, { error: 'Gemini API is not configured. Add GEMINI_API_KEY to your environment variables.' });
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (body.action === 'start') {
      const { audioBase64, mimeType } = body;
      const allowedMimeTypes = [
        'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/ogg',
        'audio/flac', 'audio/m4a', 'audio/webm',
      ];
      if (typeof audioBase64 !== 'string' || !audioBase64) {
        return jsonResponse(400, { error: 'Choose an audio file to convert.' });
      }
      if (audioBase64.length > 4_300_000) {
        return jsonResponse(413, { error: 'Audio must be 3 MB or smaller.' });
      }
      if (!allowedMimeTypes.includes(mimeType)) {
        return jsonResponse(400, { error: 'Use a WAV, MP3, AAC, OGG, FLAC, M4A, or WebM audio file.' });
      }

      const operation = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        input: [
          {
            type: 'text',
            text: 'Analyze this audio for its spoken content, sounds, mood, setting, and pacing. Return a concise visual treatment for a photorealistic short video that illustrates the audio. Do not invent visible dialogue or captions. Focus on coherent scenes and natural camera motion.',
          },
          { type: 'audio', data: audioBase64, mime_type: mimeType },
        ],
        background: true,
        store: true,
      });

      return jsonResponse(200, {
        stage: 'analysis',
        operationId: operation.id,
        done: false,
      });
    }

    if (body.action !== 'poll' || typeof body.operationId !== 'string' || !body.operationId) {
      return jsonResponse(400, { error: 'Invalid video generation request.' });
    }

    const operation = await ai.interactions.get(body.operationId);
    const status = operation.status.toLowerCase();
    if (status === 'failed' || status === 'cancelled') {
      return jsonResponse(502, { error: 'Gemini could not complete this generation. Check model availability and billing, then try again.' });
    }
    if (status !== 'completed') {
      return jsonResponse(200, { stage: body.stage, operationId: operation.id, done: false });
    }

    if (body.stage === 'analysis') {
      const visualTreatment = operation.output_text?.trim();
      if (!visualTreatment) {
        return jsonResponse(502, { error: 'Could not understand the audio well enough to create a video.' });
      }
      const userDirection = typeof body.visualDirection === 'string'
        ? body.visualDirection.trim().slice(0, 500)
        : '';
      const aspectRatio = body.aspectRatio === '9:16' ? '9:16' : '16:9';
      const videoOperation = await ai.interactions.create({
        model: 'gemini-omni-1.1-flash',
        input: `Create a short photorealistic video inspired by this audio. Use natural lighting, believable motion, coherent locations, realistic details, and cinematic but restrained camera movement. No subtitles, logos, or added dialogue. The original audio will be added to the final video, so generate no music or sound effects. Audio interpretation: ${visualTreatment}${userDirection ? ` Visual direction: ${userDirection}` : ''}`,
        response_format: {
          type: 'video',
          delivery: 'inline',
          resolution: '360p',
          aspect_ratio: body.aspectRatio === '9:16' ? '9:16' : '16:9',
        },
        background: true,
        store: true,
      });
      return jsonResponse(200, {
        stage: 'video',
        operationId: videoOperation.id,
        done: false,
      });
    }

    if (body.stage === 'video') {
      const videoBase64 = operation.output_video?.data;
      if (!videoBase64) {
        return jsonResponse(502, { error: 'The video model returned no downloadable video.' });
      }
      return jsonResponse(200, { done: true, videoBase64, mimeType: 'video/mp4' });
    }

    return jsonResponse(400, { error: 'Invalid video generation stage.' });
  } catch (error: any) {
    console.error('Audio-to-video generation error:', error);
    return jsonResponse(500, {
      error: error?.message || 'Audio-to-video generation failed. Check Gemini model access and billing.',
    });
  }
}