import React from 'react';
import { AudioLines, Clock3, Trash2 } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import type { GeneratedAudioHistoryItem } from '../utils/audioHistory';

interface AudioHistoryProps {
  items: GeneratedAudioHistoryItem[];
  onClear: () => void;
}

export const AudioHistory: React.FC<AudioHistoryProps> = ({ items, onClear }) => (
  <div className="w-full max-w-lg mx-auto space-y-4 text-white pb-24">
    <header className="flex items-center justify-between gap-3 border-b border-purple-900/30 pb-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-300/70">
          <Clock3 className="w-3.5 h-3.5" />
          <span>Generated voices</span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-white">History</h1>
      </div>
      {items.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          title="Clear history"
          aria-label="Clear history"
          className="p-2 rounded-lg text-purple-300/70 hover:bg-purple-900/30 hover:text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </header>

    {items.length === 0 ? (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-purple-200/60">
        <AudioLines className="w-8 h-8" />
        <p className="text-sm">Your generated voices will appear here.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="space-y-2 border-b border-purple-900/30 pb-3">
            <div className="flex items-center justify-between gap-3 text-[11px] text-purple-300/60">
              <span className="truncate">{item.voice}</span>
              <time className="shrink-0" dateTime={new Date(item.createdAt).toISOString()}>
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </div>
            <AudioPlayer
              audioBase64={item.base64}
              mimeType={item.mimeType}
              title={item.text}
              voiceName={item.voice}
              autoPlay={false}
            />
          </article>
        ))}
      </div>
    )}
  </div>
);