import React, { useState } from 'react';
import {
  Bot,
  Send,
  Volume2,
  Sparkles,
  Loader2,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

export const TravelAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [responseAnswer, setResponseAnswer] = useState<string | null>(
    'Welcome! I am your AI Voice Assistant. I can write custom voiceover scripts, optimize text with natural pacing, suggest voice personas, or craft dialogue for realistic speech synthesis. How can I help you today?'
  );
  const [activeAudio, setActiveAudio] = useState<{
    base64: string;
    text: string;
  } | null>(null);

  const sampleQuestions = [
    'Write an engaging 30-second tech podcast intro.',
    'Create a calming 1-minute mindfulness meditation script.',
    'Write an articulate corporate IVR phone greeting.',
    'Give me tips on using backchanneling tags like |mhm| and <breath>.',
  ];

  const handleAsk = async (queryToAsk = question) => {
    if (!queryToAsk.trim()) return;

    setIsLoading(true);
    setActiveAudio(null);

    try {
      const res = await fetch('/api/guide-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryToAsk.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer');

      setResponseAnswer(data.answer);
      setQuestion('');
    } catch (err: any) {
      console.error('Ask assistant error:', err);
      alert('Error getting response: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakAnswer = async () => {
    if (!responseAnswer) return;

    setIsSpeaking(true);
    try {
      const textToSpeak = responseAnswer.slice(0, 400);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voice: 'Kore',
          style: 'Warm, clear, intelligent and friendly assistant voice',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'TTS error');

      if (data.audioBase64) {
        setActiveAudio({
          base64: data.audioBase64,
          text: 'AI Assistant Spoken Response',
        });
      }
    } catch (err: any) {
      console.error('TTS answer error:', err);
      alert('Unable to generate speech: ' + (err.message || 'Error'));
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 text-white pb-24">
      {/* Banner */}
      <div className="bg-[#120B27] rounded-2xl p-4 border border-[#2B1A52] shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
          <Bot className="w-3.5 h-3.5" />
          <span>Smart Voice Studio Copilot</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">
          AI Speech & Script Assistant
        </h2>
        <p className="text-xs text-purple-200/70 mt-1">
          Ask for voiceover scripts, podcast dialogues, or speech optimization tips, and preview answers in audio.
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
          💡 Quick Prompts:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              className="text-left p-2.5 rounded-xl bg-[#120B27] border border-[#2B1A52] text-xs text-purple-200 hover:border-[#8B5CF6] hover:bg-[#1A1038] transition-all flex items-center justify-between group shadow-xs"
            >
              <span className="font-medium text-[11px] truncate">{q}</span>
              <Sparkles className="w-3 h-3 text-purple-500/50 group-hover:text-purple-400 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-[#120B27] rounded-2xl p-2.5 border border-[#2B1A52] shadow-md flex items-center gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask for a script or speech idea..."
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-purple-400/40 outline-none"
        />
        <button
          onClick={() => handleAsk()}
          disabled={isLoading || !question.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </>
          )}
        </button>
      </div>

      {/* Answer Box */}
      {responseAnswer && (
        <div className="bg-[#120B27] rounded-2xl p-4 border border-[#2B1A52] space-y-3 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              AI Speech Assistant
            </span>
            <button
              onClick={handleSpeakAnswer}
              disabled={isSpeaking}
              className="px-2.5 py-1 rounded-lg bg-[#241547] hover:bg-[#311c61] text-[#D8B4FE] text-[11px] font-semibold flex items-center gap-1 transition-colors border border-purple-800/40"
            >
              {isSpeaking ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating audio...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 fill-current" />
                  <span>Listen</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-purple-100/90 leading-relaxed whitespace-pre-line font-sans">
            {responseAnswer}
          </p>

          {activeAudio && (
            <div className="pt-2">
              <AudioPlayer
                audioBase64={activeAudio.base64}
                title="AI Assistant Voice Response"
                voiceName="Kore"
                autoPlay={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
