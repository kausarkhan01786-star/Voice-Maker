import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Bot,
  Download,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { postJson } from '../utils/api';
import { saveVideoHistoryItem, type GeneratedVideoHistoryItem } from '../utils/videoHistory';
import { compressAudioForAnalysis, muxAudioIntoVideo } from '../utils/videoMux';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageDataUrl?: string;
  audioFileName?: string;
  generatedImageDataUrl?: string;
  generatedVideoUrl?: string;
  generatedVideoFilename?: string;
  audioBase64?: string;
};

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read this file.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read this file.'));
    reader.readAsDataURL(blob);
  });
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function base64ToFile(base64: string, name: string, mimeType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], name, { type: mimeType });
}

function isImageGenerationRequest(text: string): boolean {
  return /\b(?:generate|create|make|draw|paint|design)\b[\s\S]{0,80}\b(?:image|picture|photo|illustration)\b|\b(?:image|picture|photo|illustration)\b[\s\S]{0,80}\b(?:generate|create|make|draw|paint)\b|(?:ছবি|ইমেজ).{0,50}(?:তৈরি|বানাও|আঁক)|(?:তৈরি|বানাও|আঁক).{0,50}(?:ছবি|ইমেজ)/i.test(text);
}

function isVideoGenerationRequest(text: string): boolean {
  return /\b(?:generate|create|make|produce|turn|convert)\b[\s\S]{0,80}\b(?:video|clip|film)\b|\b(?:video|clip|film)\b[\s\S]{0,80}\b(?:generate|create|make|produce)\b|ভিডিও.{0,50}(?:তৈরি|বানাও|কর)|(?:তৈরি|বানাও).{0,50}ভিডিও/i.test(text);
}

function getGeminiAudioMimeType(file: File): string {
  const mimeType = file.type.toLowerCase().split(';')[0];
  if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') return 'audio/m4a';
  if (mimeType === 'audio/x-wav' || mimeType === 'audio/wave') return 'audio/wav';
  if (mimeType === 'audio/x-flac') return 'audio/flac';
  if (mimeType === 'audio/x-aac') return 'audio/aac';
  return mimeType;
}

async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare this image.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const resized = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare this image.'));
    }, 'image/jpeg', 0.75);
  });
  return readAsDataUrl(resized);
}

export const AICopilot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const videoUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    videoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleAttachmentSelection = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.type.startsWith('audio/')) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Audio must be 10 MB or smaller.');
        return;
      }
      setAttachedImage(null);
      setAttachedAudio(file);
      return;
    }
    try {
      setAttachedAudio(null);
      setAttachedImage(await prepareImage(file));
    } catch (imageError: unknown) {
      setError(imageError instanceof Error ? imageError.message : 'Could not load this image.');
    }
  };

  const handleGenerateVideo = async (prompt: string, uploadedAudio: File | null): Promise<ChatMessage> => {
    let sourceAudio = uploadedAudio;
    if (!sourceAudio) {
      setTaskStatus('Writing video narration...');
      const { response: scriptResponse, data: scriptData } = await postJson('/api/guide-ask', {
        action: 'video-script',
        prompt,
      });
      if (!scriptResponse.ok) throw new Error(scriptData.error || 'Could not write video narration.');

      const { response: speechResponse, data: speechData } = await postJson('/api/guide-ask', {
        action: 'speak',
        text: scriptData.script,
      });
      if (!speechResponse.ok) throw new Error(speechData.error || 'Could not create video narration.');
      sourceAudio = base64ToFile(speechData.audioBase64, 'voiceover.mp3', speechData.mimeType || 'audio/mpeg');
    }

    if (sourceAudio.size > 10 * 1024 * 1024) throw new Error('Audio must be 10 MB or smaller.');
    const analysisAudio = sourceAudio.size > 3 * 1024 * 1024
      ? await compressAudioForAnalysis(sourceAudio)
      : sourceAudio;

    setTaskStatus('Analyzing audio and planning scenes...');
    const { response: startResponse, data: startData } = await postJson('/api/audio-to-video', {
      action: 'start',
      audioBase64: await fileToBase64(analysisAudio),
      mimeType: getGeminiAudioMimeType(analysisAudio) || 'audio/mpeg',
      visualDirection: prompt.slice(0, 500),
      aspectRatio: '9:16',
    });
    if (!startResponse.ok) throw new Error(startData.error || 'Could not start video generation.');

    let stage = startData.stage as string;
    let operationId = startData.operationId as string;
    let videoBase64: string | undefined;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      setTaskStatus('Generating video...');
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
      const { response, data } = await postJson('/api/audio-to-video', {
        action: 'poll',
        stage,
        operationId,
        aspectRatio: '9:16',
        visualDirection: prompt.slice(0, 500),
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

    setTaskStatus('Finishing video...');
    const generatedVideo = base64ToFile(videoBase64, 'generated-video.mp4', 'video/mp4');
    const finalVideo = await muxAudioIntoVideo(generatedVideo, sourceAudio);
    const filename = `${sourceAudio.name.replace(/\.[^.]+$/, '') || 'voice'}-video.mp4`;
    const historyItem: GeneratedVideoHistoryItem = {
      id: crypto.randomUUID(),
      video: finalVideo,
      audioName: sourceAudio.name,
      filename,
      aspectRatio: '9:16',
      createdAt: Date.now(),
    };
    await saveVideoHistoryItem(historyItem);
    const videoUrl = URL.createObjectURL(finalVideo);
    videoUrlsRef.current.push(videoUrl);
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Video generated.',
      generatedVideoUrl: videoUrl,
      generatedVideoFilename: filename,
    };
  };

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if ((!text && !attachedImage && !attachedAudio) || isLoading) return;
    const wantsVideo = isVideoGenerationRequest(text) || (!text && Boolean(attachedAudio));
    const wantsImage = !wantsVideo && isImageGenerationRequest(text);
    if (attachedAudio && !wantsVideo && attachedAudio.size > 4 * 1024 * 1024) {
      setError('Audio must be 4 MB or smaller to transcribe.');
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || (attachedAudio ? 'Create a video from this audio.' : 'Please analyze this image.'),
      imageDataUrl: attachedImage || undefined,
      audioFileName: attachedAudio?.name,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft('');
    setAttachedImage(null);
    setAttachedAudio(null);
    setError(null);
    setIsLoading(true);

    try {
      if (wantsVideo) {
        const videoMessage = await handleGenerateVideo(text || userMessage.content, attachedAudio);
        setMessages((current) => [...current, videoMessage]);
      } else if (wantsImage) {
        setTaskStatus('Creating image...');
        const { response, data } = await postJson('/api/guide-ask', {
          action: 'image',
          prompt: text,
        });
        if (!response.ok) throw new Error(data.error || 'Image generation failed.');
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Image generated.',
          generatedImageDataUrl: `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`,
        }]);
      } else {
        let chatMessages = nextMessages;
        if (attachedAudio) {
          setTaskStatus('Transcribing audio...');
          const { response: transcriptionResponse, data: transcriptionData } = await postJson('/api/guide-ask', {
            action: 'transcribe',
            audioBase64: await fileToBase64(attachedAudio),
            mimeType: attachedAudio.type,
          });
          if (!transcriptionResponse.ok) throw new Error(transcriptionData.error || 'Could not transcribe audio.');
          chatMessages = nextMessages.map((message) => message.id === userMessage.id
            ? { ...message, content: `${message.content}\n\nTranscribed audio: ${transcriptionData.text}` }
            : message);
        }
        setTaskStatus('Thinking...');
        const { response, data } = await postJson('/api/guide-ask', {
          action: 'chat',
          messages: chatMessages.slice(-12).map(({ role, content, imageDataUrl }) => ({
            role,
            content,
            imageDataUrl,
          })),
        });
        if (!response.ok) throw new Error(data.error || 'Could not get a response.');
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
        }]);
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
      setTaskStatus('');
    }
  };

  const handleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }

    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Microphone recording is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (audio.size > 4 * 1024 * 1024) {
          setError('Recording is too large. Please record a shorter message.');
          return;
        }

        setIsTranscribing(true);
        try {
          const dataUrl = await readAsDataUrl(audio);
          const { response, data } = await postJson('/api/guide-ask', {
            action: 'transcribe',
            audioBase64: dataUrl.slice(dataUrl.indexOf(',') + 1),
            mimeType: audio.type,
          });
          if (!response.ok) throw new Error(data.error || 'Could not transcribe the recording.');
          setDraft((current) => `${current}${current ? ' ' : ''}${data.text}`);
        } catch (transcriptionError: unknown) {
          setError(transcriptionError instanceof Error ? transcriptionError.message : 'Could not transcribe the recording.');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (recordingError: unknown) {
      setError(recordingError instanceof Error ? recordingError.message : 'Could not start microphone recording.');
    }
  };

  const handleSpeak = async (message: ChatMessage) => {
    if (!message.content || speakingMessageId) return;
    setSpeakingMessageId(message.id);
    setError(null);
    try {
      const { response, data } = await postJson('/api/guide-ask', {
        action: 'speak',
        text: message.content,
      });
      if (!response.ok) throw new Error(data.error || 'Could not create speech.');
      setMessages((current) => current.map((item) => item.id === message.id
        ? { ...item, audioBase64: data.audioBase64 }
        : item));
    } catch (speechError: unknown) {
      setError(speechError instanceof Error ? speechError.message : 'Could not create speech.');
    } finally {
      setSpeakingMessageId(null);
    }
  };

  const suggestions = [
    'Explain a difficult topic in simple terms',
    'Help me write a professional email',
    'Translate a sentence into another language',
  ];

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-purple-900/30 bg-[#07040F]/95 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241547] text-purple-200">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI Copilot</h1>
            <p className="text-[10px] text-purple-300/60">Powered by Kausar Mia</p>
          </div>
        </div>
      </header>

      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain py-6 ${messages.length === 0 ? 'flex flex-col justify-center' : 'space-y-6'}`}>
        {messages.length === 0 ? (
          <div className="mx-auto w-full max-w-2xl space-y-5">
            <div className="text-center">
              <Sparkles className="mx-auto mb-3 h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-semibold text-white">What can I help with?</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDraft(suggestion)}
                  className="min-h-16 rounded-xl border border-[#2B1A52] bg-[#120B27] p-3 text-left text-xs text-purple-100/80 transition-colors hover:border-[#8B5CF6] hover:bg-[#1A1038]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#241547] text-purple-200">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={`min-w-0 max-w-[88%] space-y-3 ${message.role === 'user' ? 'rounded-2xl bg-[#241547] px-4 py-3' : 'py-1'}`}>
                {message.imageDataUrl && (
                  <img src={message.imageDataUrl} alt="Attached by you" className="max-h-72 max-w-full rounded-lg object-contain" />
                )}
                {message.audioFileName && (
                  <div className="flex items-center gap-2 text-xs text-purple-200/70">
                    <AudioLines className="h-4 w-4" /> {message.audioFileName}
                  </div>
                )}
                {message.content && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-purple-50">{message.content}</p>}
                {message.generatedImageDataUrl && (
                  <div className="space-y-2">
                    <img src={message.generatedImageDataUrl} alt="AI-generated result" className="max-h-[560px] w-full rounded-xl object-contain" />
                    <a
                      href={message.generatedImageDataUrl}
                      download="voicemack-image.png"
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#392269] px-3 text-xs font-medium text-purple-100 hover:bg-[#1A1038]"
                    >
                      <Download className="h-3.5 w-3.5" /> Download image
                    </a>
                  </div>
                )}
                {message.generatedVideoUrl && (
                  <div className="space-y-2">
                    <video
                      controls
                      playsInline
                      src={message.generatedVideoUrl}
                      className="max-h-[560px] w-full rounded-xl bg-black"
                      style={{ aspectRatio: '9 / 16' }}
                    />
                    <a
                      href={message.generatedVideoUrl}
                      download={message.generatedVideoFilename || 'voicemack-video.mp4'}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#392269] px-3 text-xs font-medium text-purple-100 hover:bg-[#1A1038]"
                    >
                      <Download className="h-3.5 w-3.5" /> Download video
                    </a>
                  </div>
                )}
                {message.role === 'assistant' && message.content && !message.generatedImageDataUrl && !message.generatedVideoUrl && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSpeak(message)}
                      disabled={Boolean(speakingMessageId)}
                      title="Listen to response"
                      aria-label="Listen to response"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-purple-300/70 transition-colors hover:bg-[#1A1038] hover:text-white disabled:opacity-50"
                    >
                      {speakingMessageId === message.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
                      Listen
                    </button>
                    {message.audioBase64 && (
                      <audio
                        controls
                        preload="none"
                        src={`data:audio/mpeg;base64,${message.audioBase64}`}
                        className="h-9 max-w-full"
                      />
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-purple-300/70" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            {taskStatus || 'Thinking...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <p role="alert" className="mb-2 rounded-lg border border-red-400/20 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="shrink-0 rounded-2xl border border-[#392269] bg-[#120B27] p-2 shadow-xl shadow-black/30 focus-within:border-[#8B5CF6]">
        {(attachedImage || attachedAudio) && (
          <div className="relative mb-2 inline-flex">
            {attachedImage
              ? <img src={attachedImage} alt="Selected attachment" className="h-20 w-20 rounded-lg object-cover" />
              : <div className="flex min-h-12 max-w-xs items-center gap-2 rounded-lg bg-[#1A1038] px-3 text-xs text-purple-100"><AudioLines className="h-4 w-4 shrink-0" /><span className="truncate">{attachedAudio?.name}</span></div>}
            <button
              type="button"
              onClick={() => {
                setAttachedImage(null);
                setAttachedAudio(null);
              }}
              title="Remove attachment"
              aria-label="Remove attachment"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#35205E] text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={(event) => {
            const imageItem = Array.from(event.clipboardData.items).find(
              (item) => item.kind === 'file' && item.type.startsWith('image/')
            );
            const imageFile = imageItem?.getAsFile();
            if (!imageFile) return;

            event.preventDefault();
            const pastedText = event.clipboardData.getData('text/plain');
            if (pastedText) setDraft((current) => `${current}${pastedText}`);
            void handleAttachmentSelection(imageFile);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          rows={2}
          placeholder="Message, ask for an image or video, or attach media..."
          aria-label="Message AI Copilot"
          className="max-h-40 min-h-12 w-full resize-y bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-purple-300/40"
        />
        <div className="flex items-center justify-between gap-2 border-t border-purple-900/30 pt-2">
          <div className="flex items-center gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,audio/*"
              className="hidden"
              onChange={(event) => {
                void handleAttachmentSelection(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="Attach an image or audio file"
              aria-label="Attach an image or audio file"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-purple-300/70 transition-colors hover:bg-[#241547] hover:text-white"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleRecording()}
              disabled={isTranscribing || isLoading}
              title={isRecording ? 'Stop recording' : 'Record a voice message'}
              aria-label={isRecording ? 'Stop recording' : 'Record a voice message'}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${isRecording ? 'bg-red-500/20 text-red-200' : 'text-purple-300/70 hover:bg-[#241547] hover:text-white'}`}
            >
              {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
            {isRecording && <span className="text-xs text-red-200">Recording</span>}
            {isTranscribing && <span className="text-xs text-purple-200/70">Transcribing</span>}
          </div>
          <button
            type="submit"
            disabled={isLoading || (!draft.trim() && !attachedImage && !attachedAudio)}
            title="Send message"
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-[#07120E] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </section>
  );
};