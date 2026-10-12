type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

type NetlifyResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type ChatInputMessage = {
  role: 'user' | 'assistant';
  content: string;
  imageDataUrl?: string;
};

function jsonResponse(statusCode: number, payload: Record<string, unknown>): NetlifyResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  };
}

async function openAIRequest(path: string, apiKey: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  return fetch(`https://api.openai.com/v1/${path}`, { ...init, headers });
}

async function readOpenAIResponse(response: Response): Promise<Record<string, any>> {
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(data.error?.message || 'The OpenAI request failed.');
  return data;
}

function jsonRequest(body: Record<string, unknown>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function handleChat(body: Record<string, any>, apiKey: string): Promise<NetlifyResponse> {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonResponse(400, { error: 'Send a message to start the conversation.' });
  }

  const messages: ChatInputMessage[] = body.messages.slice(-12).map((message: any) => {
    if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') {
      throw new Error('Conversation contains an invalid message.');
    }
    if (message.content.length > 12000) throw new Error('Messages must be 12,000 characters or shorter.');
    if (message.imageDataUrl !== undefined && (
      message.role !== 'user'
      || typeof message.imageDataUrl !== 'string'
      || !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(message.imageDataUrl)
      || message.imageDataUrl.length > 3_500_000
    )) {
      throw new Error('The attached image is not supported or is too large.');
    }
    return {
      role: message.role,
      content: message.content,
      imageDataUrl: message.imageDataUrl,
    };
  });

  const openAIMessages = [
    {
      role: 'system',
      content: 'You are a helpful, accurate, and thoughtful general-purpose assistant. Answer in the same language as the user unless asked otherwise. You can analyze attached images. Be clear about uncertainty and never claim to have generated an image unless an image-generation result is provided.',
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.imageDataUrl
        ? [
            { type: 'text', text: message.content },
            { type: 'image_url', image_url: { url: message.imageDataUrl, detail: 'auto' } },
          ]
        : message.content,
    })),
  ];

  const response = await openAIRequest('chat/completions', apiKey, jsonRequest({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages: openAIMessages,
    max_completion_tokens: 1600,
  }));
  const data = await readOpenAIResponse(response);
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    return jsonResponse(502, { error: 'OpenAI returned an empty response.' });
  }
  return jsonResponse(200, { answer });
}

async function handleImage(body: Record<string, any>, apiKey: string): Promise<NetlifyResponse> {
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return jsonResponse(400, { error: 'Describe the image you want to create.' });
  }
  if (body.prompt.length > 4000) {
    return jsonResponse(400, { error: 'Image prompts must be 4,000 characters or shorter.' });
  }

  const response = await openAIRequest('images/generations', apiKey, jsonRequest({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt: body.prompt.trim(),
    size: '1024x1024',
  }));
  const data = await readOpenAIResponse(response);
  const imageBase64 = data.data?.[0]?.b64_json;
  if (typeof imageBase64 !== 'string') {
    return jsonResponse(502, { error: 'OpenAI did not return an image.' });
  }
  return jsonResponse(200, { imageBase64, mimeType: 'image/png' });
}

async function handleTranscription(body: Record<string, any>, apiKey: string): Promise<NetlifyResponse> {
  if (typeof body.audioBase64 !== 'string' || body.audioBase64.length > 5_600_000) {
    return jsonResponse(400, { error: 'Record a shorter voice message and try again.' });
  }
  const audioBytes = Buffer.from(body.audioBase64, 'base64');
  if (audioBytes.length === 0 || audioBytes.length > 4 * 1024 * 1024) {
    return jsonResponse(400, { error: 'Record a shorter voice message and try again.' });
  }

  const allowedMimeTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav']);
  const mimeType = allowedMimeTypes.has(body.mimeType) ? body.mimeType : 'audio/webm';
  const audioBuffer = new Uint8Array(audioBytes.length);
  audioBuffer.set(audioBytes);
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: mimeType }), mimeType === 'audio/mp4' ? 'voice.m4a' : 'voice.webm');
  form.append('model', 'gpt-4o-mini-transcribe');

  const response = await openAIRequest('audio/transcriptions', apiKey, {
    method: 'POST',
    body: form,
  });
  const data = await readOpenAIResponse(response);
  return jsonResponse(200, { text: typeof data.text === 'string' ? data.text : '' });
}

async function handleSpeech(body: Record<string, any>, apiKey: string): Promise<NetlifyResponse> {
  if (typeof body.text !== 'string' || !body.text.trim()) {
    return jsonResponse(400, { error: 'There is no text to speak.' });
  }
  if (body.text.length > 4000) {
    return jsonResponse(400, { error: 'Responses over 4,000 characters cannot be read aloud.' });
  }

  const response = await openAIRequest('audio/speech', apiKey, jsonRequest({
    model: 'gpt-4o-mini-tts',
    voice: 'coral',
    input: body.text,
    instructions: 'Speak naturally and conversationally in the same language as the text.',
    response_format: 'mp3',
  }));
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as Record<string, any>;
    throw new Error(data.error?.message || 'Could not create spoken audio.');
  }
  const audioBase64 = Buffer.from(await response.arrayBuffer()).toString('base64');
  return jsonResponse(200, { audioBase64, mimeType: 'audio/mpeg' });
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, { error: 'OpenAI is not configured. Set OPENAI_API_KEY on the server.' });
  }

  try {
    const body = JSON.parse(event.body || '{}') as Record<string, any>;
    switch (body.action || 'chat') {
      case 'chat':
        return await handleChat(body, apiKey);
      case 'image':
        return await handleImage(body, apiKey);
      case 'transcribe':
        return await handleTranscription(body, apiKey);
      case 'speak':
        return await handleSpeech(body, apiKey);
      default:
        return jsonResponse(400, { error: 'Unknown Copilot action.' });
    }
  } catch (error: unknown) {
    console.error('OpenAI Copilot request failed:', error);
    return jsonResponse(502, {
      error: error instanceof Error ? error.message : 'The OpenAI request failed.',
    });
  }
}