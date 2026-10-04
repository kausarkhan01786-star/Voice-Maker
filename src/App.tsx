import React, { useCallback, useEffect, useState } from 'react';
import {
  Home,
  Clock,
  Sparkles,
  Bot,
  Mic,
  Volume2,
  Video,
} from 'lucide-react';
import { TTSStudio } from './components/TTSStudio';
import { AudioToVideo } from './components/AudioToVideo';
import { LahoreTour } from './components/LahoreTour';
import { TravelAssistant } from './components/TravelAssistant';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { AudioHistory } from './components/AudioHistory';
import {
  clearAudioHistory,
  deleteAudioHistoryItem,
  getAudioHistory,
  saveAudioHistoryItem,
  type GeneratedAudioHistoryItem,
} from './utils/audioHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'phrases' | 'tour' | 'guide' | 'privacy'>('home');
  const [audioHistory, setAudioHistory] = useState<GeneratedAudioHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAudioHistory().then((items) => {
      if (!cancelled) setAudioHistory(items);
    }).catch((error: unknown) => {
      console.error('Could not load audio history:', error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAudioGenerated = useCallback((item: GeneratedAudioHistoryItem) => {
    setAudioHistory((items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
    void saveAudioHistoryItem(item).catch((error: unknown) => {
      console.error('Could not save audio history:', error);
    });
  }, []);

  const handleClearHistory = () => {
    setAudioHistory([]);
    void clearAudioHistory().catch((error: unknown) => {
      console.error('Could not clear audio history:', error);
    });
  };

  const handleDeleteAudio = (id: string) => {
    setAudioHistory((items) => items.filter((item) => item.id !== id));
    void deleteAudioHistoryItem(id).catch((error: unknown) => {
      console.error('Could not delete audio history item:', error);
    });
  };

  return (
    <div className="min-h-screen bg-[#07040F] text-[#F1F0F5] flex flex-col items-center justify-start antialiased selection:bg-purple-600 selection:text-white relative overflow-x-hidden pt-3 sm:pt-4">
      {/* Ambient background glows matching mockup */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-indigo-950/30 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Container: Mobile phone viewport baseline or responsive desktop */}
      <div className="w-full max-w-md md:max-w-lg min-h-screen flex flex-col relative px-4 sm:px-5">
        {/* Desktop View Navigation Pill Tabs */}
        <div className="hidden sm:flex items-center justify-center gap-1 my-2 p-1 bg-[#130C28] rounded-2xl border border-purple-900/40 text-xs">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            🎙️ TTS Studio
          </button>
          <button
            onClick={() => setActiveTab('phrases')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'phrases'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            🎬 Audio to Video
          </button>
          <button
            onClick={() => setActiveTab('tour')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'tour'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            ✨ Voice Showcase
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            🤖 AI Copilot
          </button>
        </div>

        {/* Main Tab Content */}
        <main className="flex-1 w-full pt-1">
          <div hidden={activeTab !== 'home'}>
            <TTSStudio
              initialText="Welcome to VoiceMack! Experience the next generation of realistic speech synthesis."
              onNavigateToHistory={() => setActiveTab('history')}
              onAudioGenerated={handleAudioGenerated}
            />
          </div>
          <div hidden={activeTab !== 'history'}>
            <AudioHistory items={audioHistory} onClear={handleClearHistory} onDelete={handleDeleteAudio} />
          </div>
          <div hidden={activeTab !== 'phrases'}>
            <AudioToVideo audioHistory={audioHistory} />
          </div>
          <div hidden={activeTab !== 'tour'}>
            <LahoreTour />
          </div>
          <div hidden={activeTab !== 'guide'}>
            <TravelAssistant />
          </div>
          <div hidden={activeTab !== 'privacy'}>
            <PrivacyPolicy onBack={() => setActiveTab('home')} />
          </div>
        </main>

        {activeTab !== 'privacy' && (
          <footer className="w-full pb-24 pt-5 text-center">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className="text-xs text-purple-300/60 underline decoration-purple-500/40 underline-offset-4 transition-colors hover:text-emerald-200"
            >
              Privacy Policy
            </button>
            <p className="mt-2 text-[10px] text-purple-300/45">
              © 2026 Kausar Mia. All rights reserved.
            </p>
          </footer>
        )}

        {/* Fixed Bottom Navigation Bar matching Mockup */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0716]/95 backdrop-blur-xl border-t border-purple-900/30 py-2.5 px-3 sm:px-6">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab('home')}
              className={`min-w-0 flex flex-1 flex-col items-center gap-1 transition-colors ${
                activeTab === 'home'
                  ? 'text-[#A855F7] font-bold'
                  : 'text-purple-300/50 hover:text-purple-200'
              }`}
            >
              <Home className="w-5 h-5 fill-current" />
              <span className="text-[11px]">Home</span>
            </button>

            {/* Phrases / History Tab */}
            <button
              onClick={() => setActiveTab('history')}
                className={`min-w-0 flex flex-1 flex-col items-center gap-1 transition-colors ${
                activeTab === 'history'
                  ? 'text-[#A855F7] font-bold'
                  : 'text-purple-300/50 hover:text-purple-200'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[11px]">History</span>
            </button>

            <button
              onClick={() => setActiveTab('phrases')}
              aria-label="Audio to Video"
              className={`min-w-0 flex flex-1 flex-col items-center gap-1 transition-colors ${
                activeTab === 'phrases'
                  ? 'text-[#A855F7] font-bold'
                  : 'text-purple-300/50 hover:text-purple-200'
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="text-center text-[10px] leading-3">Audio to<br />Video</span>
            </button>

            {/* Showcase Tab */}
            <button
              onClick={() => setActiveTab('tour')}
              className={`min-w-0 flex flex-1 flex-col items-center gap-1 transition-colors ${
                activeTab === 'tour'
                  ? 'text-[#A855F7] font-bold'
                  : 'text-purple-300/50 hover:text-purple-200'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[11px]">Showcase</span>
            </button>

            {/* AI Assistant Tab */}
            <button
              onClick={() => setActiveTab('guide')}
              className={`min-w-0 flex flex-1 flex-col items-center gap-1 transition-colors ${
                activeTab === 'guide'
                  ? 'text-[#A855F7] font-bold'
                  : 'text-purple-300/50 hover:text-purple-200'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span className="text-[11px]">Assistant</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
