/**
 * Client-side audio cache and Web Speech API fallback utility
 * Ensures continuous speech playback even during Gemini API free tier rate limits (429)
 */

// In-memory audio cache for current session
const clientAudioCache = new Map<string, string>();

export function getCachedAudio(key: string): string | null {
  return clientAudioCache.get(key) || null;
}

export function setCachedAudio(key: string, base64: string): void {
  clientAudioCache.set(key, base64);
}

/**
 * Speaks text using the browser's built-in Web Speech Synthesis
 * Defaults to clear English ('en-US') with multi-language fallback
 */
export function playBrowserSpeech(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this browser.');
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any previous speech

    // Clean special tags like <laugh>, |mhm| for browser TTS
    const cleanText = text
      .replace(/<[^>]+>/g, '')
      .replace(/\|[^|]+\|/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate || 0.95;
    utterance.pitch = options?.pitch || 1.0;
    utterance.lang = options?.lang || 'en-US';

    // Try finding an appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('Browser speech error:', err);
    return false;
  }
}

export function stopBrowserSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
