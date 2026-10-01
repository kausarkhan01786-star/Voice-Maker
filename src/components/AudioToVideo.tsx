import React, { useEffect, useMemo, useState } from 'react';
import { AudioLines, Clock3, Download, Film, Loader2, Sparkles, Trash2, Upload, Video } from 'lucide-react';
import type { GeneratedAudioHistoryItem } from '../utils/audioHistory';
import {
  clearVideoHistory,
  getVideoHistory,
  saveVideoHistoryItem,
  type GeneratedVideoHistoryItem,
} from '../utils/videoHistory';
import { compressAudioForAnalysis, muxAudioIntoVideo } from '../utils/videoMux';
import { postJson } from '../utils/api';

interface AudioToVideoProps {
  audioHistory: GeneratedAudioHistoryItem[];
}

type ConversionStage = 'analysis' | 'video';

const VideoHistoryItem: React.FC<{ item: GeneratedVideoHistoryItem }> = ({ item }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(item.video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.video]);

  return (
    <article className="space-y-2 border-b border-purple-900/30 pb-4">
      <video
        controls
        playsInline
        src={videoUrl || undefined}
        className="max-h-[420px] w-full rounded-lg bg-black"
        style={{ aspectRatio: item.aspectRatio }}
      />
      <div className="flex items-center justify-between gap-3 text-[11px] text-purple-200/60">
        <span className="min-w-0 truncate">{item.audioName}</span>
        <time className="shrink-0" dateTime={new Date(item.createdAt).toISOString()}>
          {new Date(item.createdAt).toLocaleString()}
        </time>
      </div>
      {videoUrl && (
        <a
          href={videoUrl}
          download={item.filename}
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white"
        >
          <Download className="h-4 w-4" /> Download MP4
        </a>
      )}
    </article>
  );
};

function base64ToFile(base64: string, name: string, mimeType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], name, { type: mimeType });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read this audio file.'));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read this audio file.'));
    reader.readAsDataURL(file);
  });
}

function getGeminiAudioMimeType(file: File): string {
  const mimeType = file.type.toLowerCase().split(';')[0];
  if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') return 'audio/m4a';
  if (mimeType === 'audio/x-wav' || mimeType === 'audio/wave') return 'audio/wav';
  if (mimeType === 'audio/x-flac') return 'audio/flac';
  if (mimeType === 'audio/x-aac') return 'audio/aac';
  return mimeType;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export const AudioToVideo: React.FC<AudioToVideoProps> = ({ audioHistory }) => {
  const [sourceMode, setSourceMode] = useState<'upload' | 'generated'>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [visualDirection, setVisualDirection] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [isConverting, setIsConverting] = useState(false);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideoHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const selectedHistoryAudio = audioHistory.find((item) => item.id === selectedAudioId);
  const selectedFile = useMemo(() => {
    if (sourceMode === 'upload') return audioFile;
    if (!selectedHistoryAudio) return null;
    return base64ToFile(
      selectedHistoryAudio.base64,
      'generated-voice.wav',
      selectedHistoryAudio.mimeType
    );
  }, [sourceMode, audioFile, selectedHistoryAudio]);

  useEffect(() => {
    let cancelled = false;
    getVideoHistory().then((items) => {
      if (!cancelled) {
        setVideoHistory((current) => {
          const currentIds = new Set(current.map((item) => item.id));
          return [...current, ...items.filter((item) => !currentIds.has(item.id))]
            .sort((a, b) => b.createdAt - a.createdAt);
        });
      }
    }).catch((historyError: unknown) => {
      if (!cancelled) setError(historyError instanceof Error ? historyError.message : 'Could not load video history.');
    }).finally(() => {
      if (!cancelled) setIsLoadingHistory(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleConvert = async () => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Audio must be 10 MB or smaller.');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      setStatus(selectedFile.size > 3 * 1024 * 1024 ? 'Preparing audio for analysis' : 'Analyzing audio and planning scenes');
      const analysisFile = selectedFile.size > 3 * 1024 * 1024
        ? await compressAudioForAnalysis(selectedFile)
        : selectedFile;
      setStatus('Analyzing audio and planning scenes');
      const { response: startResponse, data: startData } = await postJson('/api/audio-to-video', {
        action: 'start',
        audioBase64: await fileToBase64(analysisFile),
        mimeType: getGeminiAudioMimeType(analysisFile) || 'audio/wav',
      });
      if (!startResponse.ok) throw new Error(startData.error || 'Could not analyze the audio.');

      let stage: ConversionStage = startData.stage;
      let operationId = startData.operationId as string;
      let videoBase64: string | undefined;

      for (let attempt = 0; attempt < 90; attempt += 1) {
        setStatus(stage === 'analysis' ? 'Understanding the audio' : 'Generating realistic video');
        await wait(4000);
        const { response, data } = await postJson('/api/audio-to-video', {
          action: 'poll',
          stage,
          operationId,
          aspectRatio,
          visualDirection,
        });
        if (!response.ok) throw new Error(data.error || 'Video generation failed.');
        if (data.done) {
          videoBase64 = data.videoBase64;
          break;
        }
        stage = data.stage;
        operationId = data.operationId;
      }

      if (!videoBase64) throw new Error('Video generation took too long. Please try again.');

      setStatus('Syncing the original audio with the video');
      const generatedVideo = base64ToFile(videoBase64, 'generated-video.mp4', 'video/mp4');
      const finalVideo = await muxAudioIntoVideo(generatedVideo, selectedFile);
      const audioBaseName = selectedFile.name.replace(/\.[^.]+$/, '') || 'audio';
      const item: GeneratedVideoHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        video: finalVideo,
        audioName: selectedFile.name,
        filename: `${audioBaseName}-video.mp4`,
        aspectRatio,
        createdAt: Date.now(),
      };
      await saveVideoHistoryItem(item);
      setVideoHistory((items) => [item, ...items]);
      setStatus('Video ready');
    } catch (conversionError: unknown) {
      setError(conversionError instanceof Error ? conversionError.message : 'Video generation failed.');
      setStatus('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearVideoHistory();
      setVideoHistory([]);
    } catch (historyError: unknown) {
      setError(historyError instanceof Error ? historyError.message : 'Could not clear video history.');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5 pb-24 text-white">
    <section className="space-y-4 border-b border-purple-900/40 pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
          <Film className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">
            <Sparkles className="h-3 w-3" />
            <span>AI Studio</span>
          </div>
          <h2 className="text-lg font-bold text-white">Audio to Video</h2>
        </div>
      </div>

      <div className="flex rounded-lg border border-purple-900/40 bg-[#100A20] p-1">
        <button
          type="button"
          onClick={() => setSourceMode('upload')}
          disabled={isConverting}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${sourceMode === 'upload' ? 'bg-emerald-400 text-[#07110E]' : 'text-purple-200/70 hover:text-white'}`}
        >
          <Upload className="mr-1.5 inline h-3.5 w-3.5" /> Upload audio
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('generated')}
          disabled={isConverting}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${sourceMode === 'generated' ? 'bg-emerald-400 text-[#07110E]' : 'text-purple-200/70 hover:text-white'}`}
        >
          <AudioLines className="mr-1.5 inline h-3.5 w-3.5" /> Generated voice
        </button>
      </div>

      {sourceMode === 'upload' ? (
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-purple-700/50 bg-[#100A20] px-4 py-4 text-center hover:border-emerald-400/70">
          <Upload className="h-5 w-5 text-emerald-300" />
          <span className="text-xs text-purple-100">{audioFile?.name || 'Choose an audio file, up to 10 MB'}</span>
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={isConverting}
            onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
          />
        </label>
      ) : (
        <select
          value={selectedAudioId}
          onChange={(event) => setSelectedAudioId(event.target.value)}
          disabled={isConverting}
          className="w-full rounded-lg border border-purple-800/50 bg-[#100A20] px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
        >
          <option value="">Select a generated voice</option>
          {audioHistory.map((item) => (
            <option key={item.id} value={item.id}>
              {item.voice} · {item.text.slice(0, 55)}
            </option>
          ))}
        </select>
      )}

      {selectedFile && audioUrl && (
        <audio controls preload="metadata" src={audioUrl} className="h-10 w-full" />
      )}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={visualDirection}
          onChange={(event) => setVisualDirection(event.target.value)}
          disabled={isConverting}
          maxLength={500}
          placeholder="Visual direction (optional)"
          className="min-w-0 rounded-lg border border-purple-800/50 bg-[#100A20] px-3 py-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-emerald-400"
        />
        <select
          value={aspectRatio}
          onChange={(event) => setAspectRatio(event.target.value as '16:9' | '9:16')}
          disabled={isConverting}
          aria-label="Video aspect ratio"
          className="rounded-lg border border-purple-800/50 bg-[#100A20] px-2 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
        >
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={!selectedFile || isConverting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-[#07110E] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        {isConverting ? 'Creating video...' : 'Create video'}
      </button>

      {status && <p className="text-xs text-emerald-200/80">{status}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-700/40 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</p>}

    </section>
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3 border-b border-purple-900/30 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-300/70">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Saved videos</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">Video History</h2>
        </div>
        {videoHistory.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            title="Clear video history"
            aria-label="Clear video history"
            className="rounded-lg p-2 text-purple-300/70 transition-colors hover:bg-purple-900/30 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>
      {isLoadingHistory ? (
        <div className="flex min-h-24 items-center justify-center text-purple-200/60">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : videoHistory.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-purple-200/60">
          <Film className="h-6 w-6" />
          <p className="text-xs">Generated videos will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videoHistory.map((item) => <VideoHistoryItem key={item.id} item={item} />)}
        </div>
      )}
    </section>
    </div>
  );
};