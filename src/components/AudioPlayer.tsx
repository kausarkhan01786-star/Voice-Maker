import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
} from 'lucide-react';

interface AudioPlayerProps {
  audioBase64: string | null;
  audioUrl?: string | null;
  mimeType?: string;
  title?: string;
  voiceName?: string;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBase64,
  audioUrl = null,
  mimeType = 'audio/wav',
  title = 'Your audio will appear here',
  voiceName,
  autoPlay = true,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(16);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [shared, setShared] = useState(false);
  const hasAudio = Boolean(audioUrl || audioBase64);

  useEffect(() => {
    if (!hasAudio) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const sourceUrl = audioUrl || `data:${mimeType};base64,${audioBase64}`;
    const audio = new Audio(sourceUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 16);
      if (autoPlay) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
    };
  }, [audioBase64, audioUrl, hasAudio, mimeType]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const downloadWav = () => {
    if (!hasAudio) return;
    const a = document.createElement('a');
    a.href = audioUrl || `data:${mimeType};base64,${audioBase64}`;
    const extension = mimeType.includes('mp3') || mimeType.includes('mpeg') ? 'mp3' : 'wav';
    a.download = `voicemack-audio-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#130C28]/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#2D1B54] shadow-2xl text-white transition-all">
      <div className="flex items-center gap-3">
        {/* Circular Play / Pause Button matching Mockup */}
        <button
          onClick={togglePlay}
          disabled={!hasAudio}
          title={isPlaying ? 'Pause' : 'Play'}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-lg shadow-purple-600/30 ${
            hasAudio
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white'
              : 'bg-purple-900/40 text-purple-300/50 cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Center: Title + Progress Bar + Time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-xs sm:text-sm font-medium text-stone-200 truncate">
              {audioBase64 ? title : 'Your audio will appear here'}
            </p>
            {voiceName && (
              <span className="hidden sm:inline-block text-[11px] text-purple-300/80 font-mono">
                {voiceName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Custom slider with purple progress bar */}
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 16}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
                disabled={!hasAudio}
                className="w-full h-1.5 bg-[#251547] rounded-lg appearance-none cursor-pointer accent-[#A855F7] focus:outline-none"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] text-purple-300/80 font-mono shrink-0 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Right Actions: Download & Share */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={downloadWav}
            disabled={!audioBase64}
            title="Download WAV"
            className="p-2 sm:p-2.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={handleShare}
            title={shared ? 'Link copied!' : 'Share'}
            className="p-2 sm:p-2.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/30 transition-colors"
          >
            {shared ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Speed Chips row when audio is loaded */}
          {hasAudio && (
        <div className="mt-2.5 pt-2 border-t border-purple-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-purple-400/80">Speed:</span>
            {[0.8, 1, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                  playbackRate === rate
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-purple-300/70 hover:bg-purple-900/40'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <span className="text-[10px] text-purple-400/60 font-mono">
            Gemini 3.8 Flash TTS • 24kHz
          </span>
        </div>
      )}
    </div>
  );
};
