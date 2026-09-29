import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initializing the server-side Gemini SDK instance with mandatory User-Agent
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// In-memory cache to conserve API quota and provide instant replay
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; voice: string }>();

// Primary TTS endpoint powered by gemini-3.8-flash-tts with automatic fallback & caching
app.post('/api/tts', async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY in a local .env file.' });
  }

  try {
    const {
      text,
      voice = 'Kore',
      style = 'Warm, natural, friendly and authentic conversational tone',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    const validVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'Kore';
    const cacheKey = `${selectedVoice}::${text.trim()}::${style}`;

    // Return cached audio if available
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      return res.json({
        ...cached,
        cached: true,
      });
    }

    let base64Audio: string | undefined;
    let usedModel = 'gemini-3.8-flash-tts';

    // Step 1: Attempt generation with gemini-3.8-flash-tts
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (primaryErr: any) {
      console.warn('gemini-3.8-flash-tts encountered error, checking fallback...', primaryErr?.status || primaryErr?.message);
      
      const isQuotaError =
        primaryErr?.status === 429 ||
        primaryErr?.message?.includes('429') ||
        primaryErr?.message?.includes('quota') ||
        primaryErr?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError) {
        // Step 2: Try fallback to gemini-3.8-flash-lite-tts which has separate quota
        console.log('Attempting fallback to gemini-3.8-flash-lite-tts...');
        try {
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: text.trim(),
                    speechMetadata: {
                      style,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });
          base64Audio = fallbackRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          usedModel = 'gemini-3.8-flash-lite-tts';
        } catch (fallbackErr: any) {
          console.error('Fallback model also hit quota limit:', fallbackErr?.message);
          
          // Extract retry delay if available
          let retrySeconds = 60;
          const retryMatch = primaryErr?.message?.match(/retry in ([0-9.]+)s/i) || fallbackErr?.message?.match(/retry in ([0-9.]+)s/i);
          if (retryMatch && retryMatch[1]) {
            retrySeconds = Math.ceil(parseFloat(retryMatch[1]));
          }

          return res.status(429).json({
            error: 'Gemini TTS free tier request limit reached. Automatic retry in progress.',
            isQuotaExceeded: true,
            retrySeconds,
            canUseBrowserSpeech: true,
          });
        }
      } else {
        throw primaryErr;
      }
    }

    if (!base64Audio) {
      return res.status(500).json({
        error: 'No audio data received from Gemini TTS model.',
      });
    }

    const payload = {
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: selectedVoice,
      modelUsed: usedModel,
    };

    // Store in cache (limit to 100 items to prevent memory bloat)
    if (ttsAudioCache.size > 100) {
      const firstKey = ttsAudioCache.keys().next().value;
      if (firstKey) ttsAudioCache.delete(firstKey);
    }
    ttsAudioCache.set(cacheKey, payload);

    res.json(payload);
  } catch (error: any) {
    console.error('Error generating speech with TTS:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate speech with TTS',
    });
  }
});

// AI Voice & Speech Assistant endpoint powered by gemini-3.8-flash
app.post('/api/guide-ask', async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY in a local .env file.' });
  }

  try {
    const { question, userContext = 'A user exploring voice synthesis, voiceovers, podcasts, and speech generation' } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required.' });
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

    const text = response.text || '';
    res.json({ answer: text });
  } catch (error: any) {
    console.error('Error getting assistant response from gemini-3.8-flash:', error);
    res.status(500).json({
      error: error.message || 'Failed to get voice assistant response',
    });
  }
});

app.post('/api/music', async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY in a local .env file.' });
  }

  try {
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Describe the background music you want.' });
    }
    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Keep the music description under 500 characters.' });
    }

    const interaction = await ai.interactions.create({
      model: 'lyria-3-clip-preview',
      input: `Create a 30-second instrumental background music clip for narration. No vocals, lyrics, or sound effects. Keep the arrangement unobtrusive and loop-friendly. Direction: ${prompt.trim()}`,
      response_format: { type: 'audio' },
    });
    const audio = interaction.output_audio;
    if (!audio?.data) {
      return res.status(502).json({ error: 'The music model did not return an audio clip.' });
    }

    res.json({
      audioBase64: audio.data,
      mimeType: audio.mime_type || 'audio/mp3',
      title: interaction.output_text || 'AI background music',
    });
  } catch (error: any) {
    console.error('Error generating background music:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate background music.' });
  }
});

// Vite middleware mounting in development or static hosting in production
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[VoiceMack] Full-stack TTS server running on http://0.0.0.0:${PORT}`);
});
