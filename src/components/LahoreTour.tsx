import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Loader2,
  Radio,
  FileText,
  Bookmark,
} from 'lucide-react';
import { LAHORE_ATTRACTIONS, VoiceShowcaseDemo } from '../data/lahoreData';
import { AudioPlayer } from './AudioPlayer';
import {
  getCachedAudio,
  setCachedAudio,
  playBrowserSpeech,
} from '../utils/speechFallback';

export const LahoreTour: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<VoiceShowcaseDemo>(
    LAHORE_ATTRACTIONS[0]
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fallbackSpeakingId, setFallbackSpeakingId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<{
    base64: string;
    title: string;
    voice: string;
  } | null>(null);

  const handlePlayAudioDemo = async (demo: VoiceShowcaseDemo) => {
    const cacheKey = `demo_${demo.id}_${demo.recommendedVoice}`;
    const cached = getCachedAudio(cacheKey);
    if (cached) {
      setActiveAudio({
        base64: cached,
        title: `${demo.title} - Voice Demo`,
        voice: `${demo.recommendedVoice} (Cached)`,
      });
      return;
    }

    setLoadingId(demo.id);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: demo.spokenTourScript,
          voice: demo.recommendedVoice,
          style: demo.audioStyle,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429 || data.isQuotaExceeded) {
          setFallbackSpeakingId(demo.id);
          playBrowserSpeech(demo.spokenTourScript, {
            lang: 'en-US',
            onEnd: () => setFallbackSpeakingId(null),
            onError: () => setFallbackSpeakingId(null),
          });
          return;
        }
        throw new Error(data.error || 'Demo audio generation failed');
      }

      if (data.audioBase64) {
        setCachedAudio(cacheKey, data.audioBase64);
        setActiveAudio({
          base64: data.audioBase64,
          title: `${demo.title} - Voice Demo`,
          voice: `${demo.recommendedVoice} (${data.modelUsed || 'Gemini TTS'})`,
        });
      }
    } catch (err: any) {
      setFallbackSpeakingId(demo.id);
      playBrowserSpeech(demo.spokenTourScript, {
        lang: 'en-US',
        onEnd: () => setFallbackSpeakingId(null),
        onError: () => setFallbackSpeakingId(null),
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 text-white pb-24">
      {/* Banner */}
      <div className="bg-[#120B27] rounded-2xl p-4 border border-[#2B1A52] shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated Audio Productions</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">
          Voice Showcase & Story Demos
        </h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Experience how expressive Gemini 3.8 Flash TTS sounds in documentary, audiobook, keynote, and podcast environments.
        </p>
      </div>

      {/* Floating Audio Player when listening */}
      {activeAudio && (
        <div className="sticky top-2 z-20">
          <AudioPlayer
            audioBase64={activeAudio.base64}
            title={activeAudio.title}
            voiceName={activeAudio.voice}
            autoPlay={true}
          />
        </div>
      )}

      {/* Demo Selector Grid */}
      <div className="grid grid-cols-2 gap-2">
        {LAHORE_ATTRACTIONS.map((demo) => {
          const isSelected = selectedDemo.id === demo.id;
          return (
            <button
              key={demo.id}
              onClick={() => setSelectedDemo(demo)}
              className={`p-3 rounded-2xl text-left transition-all border ${
                isSelected
                  ? 'bg-[#1C123D] border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                  : 'bg-[#120B27] border-[#2B1A52] hover:bg-[#160E30]'
              }`}
            >
              <div className="text-[10px] text-purple-400 uppercase tracking-wider font-mono truncate mb-0.5">
                {demo.category}
              </div>
              <div className="text-xs font-bold text-white truncate">
                {demo.title}
              </div>
              <div className="text-[10px] text-purple-300/60 truncate mt-0.5">
                Voice: {demo.recommendedVoice}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Demo Detail Card */}
      <div className="bg-[#120B27] rounded-2xl p-4 border border-[#2B1A52] space-y-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-[#2A1852] text-[#D8B4FE] text-[10px] font-mono border border-purple-800/40">
              {selectedDemo.category}
            </span>
            <span className="text-xs text-purple-400 font-mono">
              Voice: {selectedDemo.recommendedVoice}
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white">
            {selectedDemo.title}
          </h3>
          <p className="text-xs text-purple-300/80 mt-0.5">
            {selectedDemo.tagline}
          </p>
        </div>

        {/* Big TTS Audio Button */}
        <button
          onClick={() => handlePlayAudioDemo(selectedDemo)}
          disabled={loadingId === selectedDemo.id}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#6366F1] hover:from-[#6D28D9] text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {loadingId === selectedDemo.id ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Audio Demo...</span>
            </>
          ) : fallbackSpeakingId === selectedDemo.id ? (
            <>
              <Radio className="w-4 h-4 animate-pulse text-amber-300" />
              <span>Playing Browser Speech...</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 fill-current" />
              <span>Play Voice Demo (Gemini TTS)</span>
            </>
          )}
        </button>

        {/* Narrative Description & Script Preview */}
        <div className="space-y-2">
          <p className="text-xs text-purple-100/90 leading-relaxed">
            {selectedDemo.description}
          </p>

          <div className="bg-[#170E30] p-3 rounded-xl border border-purple-900/30 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
              <FileText className="w-3 h-3 text-purple-400" />
              <span>Spoken Narration Script:</span>
            </div>
            <p className="text-[11px] text-purple-200/80 italic leading-relaxed">
              "{selectedDemo.spokenTourScript}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
