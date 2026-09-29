import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  Loader2,
  Settings,
  Info,
  Sun,
  Landmark,
  Car,
  Keyboard,
  Clock,
  Radio,
} from 'lucide-react';
import { VOICE_PROFILES, STYLE_PRESETS, QUICK_PROMPTS } from '../data/lahoreData';
import microphoneImage from '../assets/images/microphone_glow_violet_1790654219590.jpg';
import { AudioPlayer } from './AudioPlayer';
import { postJson } from '../utils/api';
import {
  getCachedAudio,
  setCachedAudio,
  playBrowserSpeech,
} from '../utils/speechFallback';

interface TTSStudioProps {
  initialText?: string;
  onNavigateToHistory?: () => void;
}

export const TTSStudio: React.FC<TTSStudioProps> = ({
  initialText = 'Welcome to VoiceMack! Experience the next generation of realistic speech synthesis.',
  onNavigateToHistory,
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedStyle, setSelectedStyle] = useState('warm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<{
    base64: string;
    text: string;
    voice: string;
    modelUsed?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quotaCountdown, setQuotaCountdown] = useState<number | null>(null);
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Timer effect for rate-limit cooldown
  useEffect(() => {
    if (quotaCountdown === null || quotaCountdown <= 0) return;
    const interval = setInterval(() => {
      setQuotaCountdown((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [quotaCountdown]);

  const activeStyleObj =
    STYLE_PRESETS.find((s) => s.id === selectedStyle) || STYLE_PRESETS[0];

  const handleGenerateTTS = async (
    textToSpeak = inputText,
    voiceToUse = selectedVoice
  ) => {
    if (!textToSpeak.trim()) {
      setErrorMsg('Please enter some text to generate audio.');
      return;
    }

    setErrorMsg(null);

    // Check client-side cache first
    const cacheKey = `${voiceToUse}::${textToSpeak.trim()}::${activeStyleObj.value}`;
    const cachedBase64 = getCachedAudio(cacheKey);
    if (cachedBase64) {
      setCurrentAudio({
        base64: cachedBase64,
        text: textToSpeak.trim(),
        voice: voiceToUse,
        modelUsed: 'gemini-3.8-flash-tts (cached)',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { response, data } = await postJson('/api/tts', {
          text: textToSpeak.trim(),
          voice: voiceToUse,
          style: activeStyleObj.value,
      });

      if (!response.ok) {
        if (response.status === 429 || data.isQuotaExceeded) {
          const waitTime = data.retrySeconds || 56;
          setQuotaCountdown(waitTime);
          throw new Error(
            `Gemini TTS free tier limit reached. Please wait ${waitTime}s or use the browser speech fallback below.`
          );
        }
        throw new Error(data.error || 'Failed to generate speech audio.');
      }

      if (data.audioBase64) {
        setCachedAudio(cacheKey, data.audioBase64);

        const newAudio = {
          base64: data.audioBase64,
          text: textToSpeak.trim(),
          voice: voiceToUse,
          modelUsed: data.modelUsed || 'gemini-3.8-flash-tts',
        };
        setCurrentAudio(newAudio);
      }
    } catch (err: any) {
      console.error('TTS Generation error:', err);
      setErrorMsg(
        err.message || 'Unable to generate audio with Gemini 3.8 Flash TTS.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBrowserFallbackSpeak = (text = inputText) => {
    setIsBrowserSpeaking(true);
    playBrowserSpeech(text, {
      lang: 'en-US',
      onEnd: () => setIsBrowserSpeaking(false),
      onError: () => setIsBrowserSpeaking(false),
    });
  };

  const insertBackchannel = (token: string) => {
    setInputText((prev) => `${prev} ${token} `);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5 text-white pb-24">
      {/* App Header: Waveform Logo + VoiceMack + Settings Icon */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center gap-2.5">
          {/* Waveform Bars matching mockup */}
          <div className="flex items-center gap-1 h-6">
            <span className="w-1 h-3.5 bg-pink-500 rounded-full animate-pulse" />
            <span className="w-1 h-6 bg-purple-500 rounded-full" />
            <span className="w-1 h-4 bg-indigo-400 rounded-full" />
            <span className="w-1 h-5 bg-purple-400 rounded-full" />
          </div>
          <div>
            <div className="flex items-center text-lg sm:text-xl font-bold tracking-tight">
              <span className="text-white">Voice</span>
              <span className="text-[#A855F7]">Mack</span>
            </div>
            <p className="text-[10px] text-purple-300/70 font-medium -mt-0.5">
              Text to Speech
            </p>
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setShowInfoModal(true)}
          className="w-9 h-9 rounded-full bg-[#180F33] hover:bg-[#231548] border border-purple-800/40 flex items-center justify-center text-purple-300 transition-colors shadow-sm"
          title="Voice model settings & details"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Section: Text to Speech Converter + Subtitle + 3D Glowing Microphone */}
      <div className="relative flex items-center justify-between gap-4 pt-1">
        <div className="flex-1 z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-white">
            Text to Speech
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-[#A855F7] mb-2">
            Converter
          </h2>
          <p className="text-xs sm:text-[13px] text-purple-200/80 leading-relaxed font-sans max-w-xs">
            Convert any text into realistic human speech — preview with custom styles, adjust pacing, or download studio-quality audio.
          </p>
        </div>

        {/* 3D Glowing Retro Microphone Asset matching mockup */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-purple-600/25 rounded-full blur-2xl pointer-events-none" />
          <img
            src={microphoneImage}
            alt="3D Glowing Retro Microphone"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(168,85,247,0.4)] rounded-2xl"
          />
        </div>
      </div>

      {/* Textarea Input Card matching mockup */}
      <div className="relative bg-[#120B27] rounded-2xl border border-[#2B1A52] p-4 shadow-lg focus-within:border-[#8B5CF6] transition-all">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your text here..."
          rows={3}
          className="w-full bg-transparent text-white text-sm placeholder:text-purple-300/40 outline-none resize-none font-sans leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-purple-900/20 text-xs">
          <span className="text-[11px] text-purple-400/60 font-mono">
            {inputText.length} characters
          </span>
          <button
            onClick={() => setInputText(QUICK_PROMPTS[Math.floor(Math.random() * QUICK_PROMPTS.length)])}
            title="Load sample sentence"
            className="text-purple-300/70 hover:text-purple-200 p-1 rounded-md"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Special Expressions & Backchanneling Card matching mockup */}
      <div className="bg-[#120B27] rounded-2xl border border-[#2B1A52] p-4 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>Special Expressions & Backchanneling</span>
          </div>
          <button
            onClick={() => setShowInfoModal(true)}
            className="text-purple-400/70 hover:text-purple-300"
            title="Learn more about vocal bursts"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Backchanneling Chips matching mockup */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {[
            { token: '|mhm|', label: '+ |mhm| (Mhm)' },
            { token: '|yeah|', label: '+ |yeah| (Yeah)' },
            { token: '<laugh>', label: '+ <laugh> (Laugh)' },
            { token: '<breath>', label: '+ <breath> (Breath)' },
            { token: '<gasp>', label: '+ <gasp> (Gasp)' },
          ].map(({ token, label }) => (
            <button
              key={token}
              type="button"
              onClick={() => insertBackchannel(token)}
              className="px-2.5 py-1.5 rounded-xl bg-[#1A1038] hover:bg-[#251752] border border-[#392269] text-xs text-purple-200 transition-all active:scale-95 shadow-xs"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Choose a Voice Section matching mockup */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-bold text-white px-1">
          <div className="flex items-center gap-0.5 text-[#A855F7]">
            <span className="w-0.5 h-2 bg-current rounded-full" />
            <span className="w-0.5 h-3.5 bg-current rounded-full" />
            <span className="w-0.5 h-2 bg-current rounded-full" />
          </div>
          <span>Choose a Voice</span>
        </div>

        {/* 5 Voice Persona Cards */}
        <div className="space-y-2">
          {VOICE_PROFILES.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            return (
              <div
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between border ${
                  isSelected
                    ? 'bg-[#191038] border-[#8B5CF6] shadow-[0_0_18px_rgba(139,92,246,0.35)]'
                    : 'bg-[#120B27] border-[#2B1A52] hover:bg-[#160E30]'
                }`}
              >
                {/* Left: Avatar Letter Badge + Photo Avatar + Name & Subtitle */}
                <div className="flex items-center gap-3">
                  {/* Avatar Letter circle */}
                  <div className="w-8 h-8 rounded-full bg-[#6D28D9] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {voice.initial}
                  </div>

                  {/* Photo Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500/40 shrink-0 bg-purple-950">
                    <img
                      src={voice.avatar}
                      alt={voice.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white leading-tight">
                      {voice.name}
                    </h3>
                    <p className="text-xs text-purple-300/70">{voice.subLabel}</p>
                  </div>
                </div>

                {/* Right: Tag Badge + Custom Radio Button matching mockup */}
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#2A1852] text-[#D8B4FE] border border-purple-700/30">
                    {voice.tag}
                  </span>

                  {/* Radio Indicator */}
                  <div className="text-purple-400">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full border-2 border-[#A855F7] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-purple-800/60" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice Style Presets Section (2x2 Grid) matching mockup */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-sm font-bold text-white px-1">
          <span className="text-amber-400">★</span>
          <span>Voice Style Presets</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {STYLE_PRESETS.map((preset) => {
            const isSelected = selectedStyle === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedStyle(preset.id)}
                className={`p-3 rounded-2xl text-left transition-all border flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-[#1C123D] border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'bg-[#120B27] border-[#2B1A52] hover:bg-[#160E30]'
                }`}
              >
                <div
                  className={`mt-0.5 shrink-0 ${
                    isSelected ? 'text-[#C084FC]' : 'text-purple-400/70'
                  }`}
                >
                  {preset.id === 'warm' && <Sun className="w-4 h-4" />}
                  {preset.id === 'storyteller' && <Landmark className="w-4 h-4" />}
                  {preset.id === 'local' && <Car className="w-4 h-4" />}
                  {preset.id === 'slow' && <Volume2 className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {preset.titleBn}
                  </div>
                  <div className="text-[11px] text-purple-300/60 truncate">
                    {preset.subtitleEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quota Exceeded / Rate Limit Alert with Live Countdown */}
      {quotaCountdown !== null && quotaCountdown > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="font-bold text-amber-300">
                API free tier cooling down ({quotaCountdown}s remaining)
              </p>
              <p className="text-[11px] text-amber-400/80">
                You can listen instantly using your device browser speech engine.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleBrowserFallbackSpeak()}
            disabled={isBrowserSpeaking}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Radio
              className={`w-3.5 h-3.5 ${isBrowserSpeaking ? 'animate-pulse' : ''}`}
            />
            <span>
              {isBrowserSpeaking ? 'Speaking...' : '🔊 Play Browser Voice'}
            </span>
          </button>
        </div>
      )}

      {/* Error message */}
      {errorMsg && quotaCountdown === null && (
        <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-600/50 text-rose-200 text-xs flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            onClick={() => handleBrowserFallbackSpeak()}
            className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-white font-medium rounded-lg text-xs shrink-0"
          >
            Browser Voice
          </button>
        </div>
      )}

      {/* Main CTA Button matching mockup */}
      <button
        onClick={() => handleGenerateTTS()}
        disabled={
          isGenerating ||
          !inputText.trim() ||
          (quotaCountdown !== null && quotaCountdown > 0)
        }
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-bold text-base shadow-[0_4px_25px_rgba(124,58,237,0.45)] transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating speech audio...</span>
          </>
        ) : quotaCountdown !== null && quotaCountdown > 0 ? (
          <>
            <Clock className="w-5 h-5 animate-spin" />
            <span>Please wait ({quotaCountdown}s)...</span>
          </>
        ) : (
          <>
            {/* Waveform mini icon inside button */}
            <div className="flex items-center gap-0.5">
              <span className="w-0.5 h-3 bg-white rounded-full" />
              <span className="w-0.5 h-4.5 bg-white rounded-full" />
              <span className="w-0.5 h-2.5 bg-white rounded-full" />
            </div>
            <span>Generate Voice Audio</span>
          </>
        )}
      </button>

      {/* Bottom Audio Player Bar matching mockup */}
      <AudioPlayer
        audioBase64={currentAudio?.base64 || null}
        title={
          currentAudio
            ? currentAudio.text
            : 'Your audio will appear here'
        }
        voiceName={currentAudio?.voice}
        autoPlay={true}
      />

      {/* Information Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#130C28] border border-purple-800/60 rounded-3xl p-6 max-w-sm w-full space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Model & Speech Specifications
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Powered directly by Google’s flagship{' '}
              <span className="text-purple-300 font-mono font-bold">
                gemini-3.8-flash-tts
              </span>{' '}
              engine, providing studio-grade 24kHz Unary WAV output with expressive voice design.
            </p>
            <div className="text-xs text-purple-300/70 space-y-1.5 bg-[#1B113B] p-3 rounded-xl border border-purple-800/40">
              <div>• <strong>Kore:</strong> Calm, warm and soothing female persona</div>
              <div>• <strong>Puck:</strong> Cheerful, enthusiastic male persona</div>
              <div>• <strong>Zephyr:</strong> Modern, articulate and straightforward</div>
              <div>• <strong>Fenrir:</strong> Deep, resonant and authoritative</div>
              <div>• <strong>Charon:</strong> Cinematic storyteller and narrator</div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
