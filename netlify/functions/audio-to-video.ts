type NetlifyEvent = { httpMethod: string; body: string | null };
type NetlifyResponse = { statusCode: number; headers: Record<string, string>; body: string };

function jsonResponse(statusCode: number, payload: Record<string, unknown>): NetlifyResponse {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) };
}

async function openAIRequest(path: string, apiKey: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  return fetch(`https://api.openai.com/v1/${path}`, { ...init, headers });
}

async function readOpenAIJson(response: Response): Promise<Record<string, any>> {
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) {
    const message = data.error?.message || 'OpenAI video request failed.';
    throw new Error(response.status === 429
      ? `OpenAI video rate limit or quota reached: ${message}`
      : message);
  }
  return data;
}

function decodeBase64File(value: unknown, label: string, maxBytes: number): ArrayBuffer {
  if (typeof value !== 'string' || !value) throw new Error(`Choose ${label} first.`);
  const bytes = Buffer.from(value, 'base64');
  if (!bytes.length || bytes.length > maxBytes) throw new Error(`${label} is too large.`);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function startVideo(body: Record<string, any>, apiKey: string): Promise<NetlifyResponse> {
  const audioBytes = decodeBase64File(body.audioBase64, 'an audio file', 10 * 1024 * 1024);
  const supportedAudio = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac']);
  const audioMimeType = supportedAudio.has(body.mimeType) ? body.mimeType : 'audio/mpeg';
  const audioName = audioMimeType.includes('mp4') || audioMimeType.includes('m4a') ? 'voice.m4a'
    : audioMimeType.includes('wav') ? 'voice.wav'
      : audioMimeType.includes('ogg') ? 'voice.ogg'
        : audioMimeType.includes('webm') ? 'voice.webm' : 'voice.mp3';

  const transcriptionForm = new FormData();
  transcriptionForm.append('file', new Blob([audioBytes], { type: audioMimeType }), audioName);
  transcriptionForm.append('model', 'gpt-4o-mini-transcribe');
  const transcriptionResponse = await openAIRequest('audio/transcriptions', apiKey, { method: 'POST', body: transcriptionForm });
  const transcription = await readOpenAIJson(transcriptionResponse);

  const userDirection = typeof body.visualDirection === 'string' ? body.visualDirection.trim().slice(0, 500) : '';
  const transcriptText = typeof transcription.text === 'string' ? transcription.text.trim() : '';
  const prompt = [
    'Create a short cinematic, photorealistic video that visually illustrates the meaning and mood of this audio.',
    'Use coherent scenes, natural lighting, believable motion, and restrained camera movement. No subtitles, logos, or added dialogue.',
    transcriptText ? `Audio transcript: ${transcriptText.slice(0, 2500)}` : 'The audio has no clear spoken words; create visuals that match its mood and sound.',
    userDirection ? `Visual direction: ${userDirection}` : '',
    'The original audio will be added to the finished video, so do not generate music or sound effects.',
  ].filter(Boolean).join('\n');

  const form = new FormData();
  form.append('model', process.env.OPENAI_VIDEO_MODEL || 'sora-2');
  form.append('prompt', prompt);
  form.append('size', body.aspectRatio === '9:16' ? '720x1280' : '1280x720');
  form.append('seconds', '8');
  if (typeof body.imageBase64 === 'string' && body.imageBase64) {
    const imageBytes = decodeBase64File(body.imageBase64, 'an image', 3 * 1024 * 1024);
    const imageMimeType = ['image/jpeg', 'image/png', 'image/webp'].includes(body.imageMimeType) ? body.imageMimeType : 'image/jpeg';
    const imageName = imageMimeType === 'image/png' ? 'reference.png' : imageMimeType === 'image/webp' ? 'reference.webp' : 'reference.jpg';
    form.append('input_reference', new Blob([imageBytes], { type: imageMimeType }), imageName);
  }

  const videoResponse = await openAIRequest('videos', apiKey, { method: 'POST', body: form });
  const video = await readOpenAIJson(videoResponse);
  if (typeof video.id !== 'string') return jsonResponse(502, { error: 'OpenAI did not return a video job ID.' });
  return jsonResponse(200, { stage: 'video', operationId: video.id, done: false });
}

async function pollVideo(body: Record<string, any>, apiKey: string): Promise<NetlifyResponse> {
  if (typeof body.operationId !== 'string' || !/^video_[A-Za-z0-9_-]+$/.test(body.operationId)) {
    return jsonResponse(400, { error: 'Invalid OpenAI video job ID.' });
  }
  const statusResponse = await openAIRequest(`videos/${encodeURIComponent(body.operationId)}`, apiKey);
  const video = await readOpenAIJson(statusResponse);
  if (video.status === 'failed' || video.status === 'cancelled' || video.status === 'expired') {
    return jsonResponse(502, { error: video.error?.message || `OpenAI video generation ${video.status}.` });
  }
  if (video.status !== 'completed') {
    return jsonResponse(200, { stage: 'video', operationId: video.id, done: false, progress: video.progress });
  }

  const contentResponse = await openAIRequest(`videos/${encodeURIComponent(body.operationId)}/content`, apiKey);
  if (!contentResponse.ok) {
    const errorData = await contentResponse.json().catch(() => ({})) as Record<string, any>;
    throw new Error(errorData.error?.message || 'Could not download the finished OpenAI video.');
  }
  const videoBase64 = Buffer.from(await contentResponse.arrayBuffer()).toString('base64');
  return jsonResponse(200, { done: true, videoBase64, mimeType: 'video/mp4' });
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonResponse(503, { error: 'OpenAI is not configured. Set OPENAI_API_KEY on the server.' });
  try {
    const body = JSON.parse(event.body || '{}') as Record<string, any>;
    if (body.action === 'start') return await startVideo(body, apiKey);
    if (body.action === 'poll') return await pollVideo(body, apiKey);
    return jsonResponse(400, { error: 'Invalid video generation request.' });
  } catch (error: any) {
    console.error('OpenAI video generation error:', error);
    return jsonResponse(502, { error: error?.message || 'OpenAI video generation failed.' });
  }
}
