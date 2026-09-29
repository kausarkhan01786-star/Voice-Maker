import React, { useState } from 'react';
import {
  Volume2,
  Search,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Info,
  Briefcase,
  Mic,
  MessageSquare,
  Megaphone,
  LifeBuoy,
  HandHeart,
  Radio,
} from 'lucide-react';
import { LAHORE_PHRASES, SpokenPhrase } from '../data/lahoreData';
import { AudioPlayer } from './AudioPlayer';
import { postJson } from '../utils/api';
import {
  getCachedAudio,
  setCachedAudio,
  playBrowserSpeech,
} from '../utils/speechFallback';

export const LahorePhrases: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fallbackSpeakingId, setFallbackSpeakingId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<{
    base64: string;
    phrase: SpokenPhrase;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Phrases', icon: Sparkles },
    { id: 'greetings', label: 'Greetings', icon: HandHeart },
    { id: 'business', label: 'Business', icon: Briefcase },
    { id: 'creative', label: 'Creative', icon: Mic },
    { id: 'casual', label: 'Casual', icon: MessageSquare },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'support', label: 'Support', icon: LifeBuoy },
  ];

  const filteredPhrases = LAHORE_PHRASES.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesQuery =
      item.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phoneticHint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contextTip.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleSpeakPhrase = async (phrase: SpokenPhrase) => {
    const cacheKey = `phrase_${phrase.id}_${phrase.recommendedVoice}`;
    const cached = getCachedAudio(cacheKey);
    if (cached) {
      setCurrentAudio({
        base64: cached,
        phrase,
      });
      setPlayingId(phrase.id);
      return;
    }

    setLoadingId(phrase.id);
    try {
      const { response, data } = await postJson('/api/tts', {
          text: phrase.english,
          voice: phrase.recommendedVoice,
          style: 'Warm, natural, clear and articulate voice delivery',
      });
      if (!response.ok) {
        if (response.status === 429 || data.isQuotaExceeded) {
          setFallbackSpeakingId(phrase.id);
          playBrowserSpeech(phrase.english, {
            lang: 'en-US',
            onEnd: () => setFallbackSpeakingId(null),
            onError: () => setFallbackSpeakingId(null),
          });
          return;
        }
        throw new Error(data.error || 'TTS generation error');
      }

      if (data.audioBase64) {
        setCachedAudio(cacheKey, data.audioBase64);
        setCurrentAudio({
          base64: data.audioBase64,
          phrase,
        });
        setPlayingId(phrase.id);
      }
    } catch (err: any) {
      setFallbackSpeakingId(phrase.id);
      playBrowserSpeech(phrase.english, {
        lang: 'en-US',
        onEnd: () => setFallbackSpeakingId(null),
        onError: () => setFallbackSpeakingId(null),
      });
    } finally {
      setLoadingId(null);
    }
  };

  const copyPhrase = (phrase: SpokenPhrase) => {
    navigator.clipboard.writeText(phrase.english);
    setCopiedId(phrase.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 text-white pb-24">
      {/* Header Banner */}
      <div className="bg-[#120B27] rounded-2xl p-4 border border-[#2B1A52] shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Curated Speech Catalog</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">
          Spoken Phrases & Voice Library
        </h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Explore ready-to-use spoken expressions across business, creative, announcements, and casual dialogues.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-purple-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search phrases, styles or keywords..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#120B27] rounded-xl border border-[#2B1A52] text-xs text-white placeholder:text-purple-400/40 outline-none focus:border-[#8B5CF6] transition-colors"
        />
      </div>

      {/* Category Horizontal Scroll Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-md'
                  : 'bg-[#120B27] text-purple-300/70 hover:bg-[#1A1038] border border-[#2B1A52]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Audio Player */}
      {currentAudio && (
        <div className="sticky top-2 z-20">
          <AudioPlayer
            audioBase64={currentAudio.base64}
            title={currentAudio.phrase.english}
            voiceName={currentAudio.phrase.recommendedVoice}
            autoPlay={true}
          />
        </div>
      )}

      {/* Phrases List */}
      <div className="space-y-3">
        {filteredPhrases.map((phrase) => {
          const isLoading = loadingId === phrase.id;
          const isPlaying = playingId === phrase.id;
          const isCopied = copiedId === phrase.id;
          const isFallback = fallbackSpeakingId === phrase.id;

          return (
            <div
              key={phrase.id}
              className="bg-[#120B27] rounded-2xl p-4 border border-[#2B1A52] hover:border-purple-600/50 transition-all space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-purple-300/60">
                <span className="px-2 py-0.5 rounded-full bg-[#1C113D] text-[#D8B4FE] text-[11px] font-mono border border-purple-800/40 capitalize">
                  {phrase.category}
                </span>
                <span className="font-mono text-[10px]">
                  Voice: {phrase.recommendedVoice}
                </span>
              </div>

              {/* English Phrase */}
              <div className="bg-[#180E33] rounded-xl p-3 border border-purple-900/30">
                <p className="text-sm font-semibold text-white leading-relaxed">
                  "{phrase.english}"
                </p>
              </div>

              {/* Phonetic & Style Hint */}
              <div>
                <p className="text-xs text-purple-300 font-mono font-medium">
                  Style: {phrase.phoneticHint}
                </p>
              </div>

              {/* Context Tip */}
              <div className="flex items-start gap-1.5 text-xs text-purple-300/70 bg-[#160E30] p-2 rounded-xl border border-purple-900/20">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px]">{phrase.contextTip}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-purple-900/20">
                <button
                  onClick={() => copyPhrase(phrase)}
                  className="p-1.5 rounded-lg text-purple-300/70 hover:text-white transition-colors text-xs flex items-center gap-1"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px]">
                    {isCopied ? 'Copied' : 'Copy'}
                  </span>
                </button>

                <button
                  onClick={() => handleSpeakPhrase(phrase)}
                  disabled={isLoading}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                    isPlaying || isFallback
                      ? 'bg-[#7C3AED] text-white shadow-purple-600/40'
                      : 'bg-[#1E123F] text-purple-200 hover:bg-[#281854] border border-purple-700/40'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : isFallback ? (
                    <>
                      <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                      <span>Browser voice...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 fill-current" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
