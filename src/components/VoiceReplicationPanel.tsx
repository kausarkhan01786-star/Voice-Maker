import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, Trash2, Upload, UserRoundPlus } from 'lucide-react';
import { normalizeVoiceRecording } from '../utils/videoMux';
import { postJson } from '../utils/api';
import type { ReplicatedVoiceProfile } from '../utils/voiceProfiles';

interface VoiceReplicationPanelProps {
  profiles: ReplicatedVoiceProfile[];
  selectedVoice: string;
  onSelect: (key: string) => void;
  onCreated: (profile: ReplicatedVoiceProfile) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

const CONSENT_STATEMENT = 'আমি এই ভয়েসের মালিক এবং আমি একটি সিন্থেটিক ভয়েস মডেল তৈরি করতে এই ভয়েস ব্যবহার করে Google-এর সাথে সম্মতি দিচ্ছি।';

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the voice recording.'));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read the voice recording.'));
    reader.readAsDataURL(file);
  });
}

export const VoiceReplicationPanel: React.FC<VoiceReplicationPanelProps> = ({
  profiles,
  selectedVoice,
  onSelect,
  onCreated,
  onDelete,
}) => {
  const [name, setName] = useState('My voice');
  const [sourceAudio, setSourceAudio] = useState<File | null>(null);
  const [consentAudio, setConsentAudio] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [consentPreview, setConsentPreview] = useState<string | null>(null);
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!sourceAudio) {
      setSourcePreview(null);
      return;
    }
    const url = URL.createObjectURL(sourceAudio);
    setSourcePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceAudio]);

  useEffect(() => {
    if (!consentAudio) {
      setConsentPreview(null);
      return;
    }
    const url = URL.createObjectURL(consentAudio);
    setConsentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [consentAudio]);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startConsentRecording = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('This browser does not support microphone recording.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const extension = mimeType.includes('wav') ? 'wav' : 'webm';
        setConsentAudio(new File(chunks, `voice-consent.${extension}`, { type: mimeType }));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
      };
      recorder.start();
      setConsentAudio(null);
      setIsRecording(true);
    } catch (recordingError: unknown) {
      setError(recordingError instanceof Error ? recordingError.message : 'Could not start microphone recording.');
    }
  };

  const stopConsentRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const createVoice = async () => {
    if (!sourceAudio || !consentAudio || !ownerConfirmed || !name.trim()) return;
    if (sourceAudio.size > 10 * 1024 * 1024 || consentAudio.size > 10 * 1024 * 1024) {
      setError('Each recording must be 10 MB or smaller.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const [normalizedSource, normalizedConsent] = await Promise.all([
        normalizeVoiceRecording(sourceAudio, 10, 30),
        normalizeVoiceRecording(consentAudio, 3, 20),
      ]);
      const { response, data } = await postJson('/api/replicate-voice', {
        name: name.trim(),
        sourceAudioBase64: await readAsBase64(normalizedSource),
        consentAudioBase64: await readAsBase64(normalizedConsent),
      });
      if (!response.ok) throw new Error(data.error || 'Could not replicate this voice.');
      const profile: ReplicatedVoiceProfile = {
        key: data.voiceKey,
        name: data.name,
        createdAt: Date.now(),
        expiresAt: data.expiresAt,
      };
      await onCreated(profile);
      setSourceAudio(null);
      setConsentAudio(null);
      setOwnerConfirmed(false);
    } catch (creationError: unknown) {
      setError(creationError instanceof Error ? creationError.message : 'Could not replicate this voice.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-purple-900/30 pt-4" aria-labelledby="voice-replication-heading">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <UserRoundPlus className="h-4 w-4 text-emerald-300" />
        <h3 id="voice-replication-heading">Replicate my voice</h3>
      </div>

      {profiles.length > 0 && (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.key}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${selectedVoice === profile.key ? 'border-emerald-400/70 bg-emerald-950/20' : 'border-[#2B1A52] bg-[#100A20]'}`}
            >
              <button
                type="button"
                onClick={() => onSelect(profile.key)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Mic className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="truncate text-xs font-semibold text-white">{profile.name}</span>
                {selectedVoice === profile.key && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
              </button>
              <button
                type="button"
                onClick={() => void onDelete(profile.key)}
                title={`Remove ${profile.name}`}
                aria-label={`Remove ${profile.name}`}
                className="rounded-lg p-2 text-purple-300/70 hover:bg-purple-900/30 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={48}
        placeholder="Voice name"
        aria-label="Voice name"
        disabled={isCreating || isRecording}
        className="w-full rounded-lg border border-purple-800/50 bg-[#100A20] px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
      />

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-purple-700/50 bg-[#100A20] px-3 py-3 text-xs text-purple-100 hover:border-emerald-400/70">
        <Upload className="h-4 w-4 shrink-0 text-emerald-300" />
        <span className="min-w-0 truncate">{sourceAudio?.name || 'Voice sample (10-30 sec)'}</span>
        <input
          type="file"
          accept="audio/*"
          disabled={isCreating || isRecording}
          className="sr-only"
          onChange={(event) => setSourceAudio(event.target.files?.[0] || null)}
        />
      </label>
      {sourcePreview && <audio controls preload="metadata" src={sourcePreview} className="h-9 w-full" />}

      <div className="space-y-2 rounded-lg border border-purple-900/40 bg-[#100A20] p-3">
        <p className="text-xs font-semibold text-purple-100">Consent recording, by the same speaker:</p>
        <p lang="bn" className="text-xs leading-5 text-purple-200/70">{CONSENT_STATEMENT}</p>
        <p className="text-[11px] leading-4 text-purple-300/60">The voice key stays in this browser for 7 days. Recordings are sent to Google for verification and are not saved in your VoiceMack profile.</p>
        {consentPreview && <audio controls preload="metadata" src={consentPreview} className="h-9 w-full" />}
        <button
          type="button"
          onClick={isRecording ? stopConsentRecording : startConsentRecording}
          disabled={isCreating}
          className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold ${isRecording ? 'bg-rose-700 text-white' : 'border border-purple-800/50 text-purple-100 hover:bg-purple-900/30'}`}
        >
          <Mic className="h-4 w-4" />
          {isRecording ? 'Stop consent recording' : consentAudio ? 'Record consent again' : 'Record consent'}
        </button>
      </div>

      <label className="flex items-start gap-2 text-[11px] leading-4 text-purple-200/70">
        <input
          type="checkbox"
          checked={ownerConfirmed}
          onChange={(event) => setOwnerConfirmed(event.target.checked)}
          disabled={isCreating}
          className="mt-0.5 accent-emerald-400"
        />
        <span>The voice owner is an adult and personally recorded the consent statement above.</span>
      </label>

      <button
        type="button"
        onClick={() => void createVoice()}
        disabled={!sourceAudio || !consentAudio || !ownerConfirmed || !name.trim() || isCreating || isRecording}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 text-xs font-bold text-[#07110E] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
        {isCreating ? 'Creating voice…' : 'Create replicated voice'}
      </button>

      {error && <p role="alert" className="rounded-lg border border-rose-700/40 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</p>}
    </section>
  );
};