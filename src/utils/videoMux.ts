import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
const MAX_ANALYSIS_AUDIO_BYTES = 3_150_000;
let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (!loadPromise) {
    loadPromise = (async () => {
      const instance = new FFmpeg();
      await instance.load({
        coreURL: `${CORE_BASE_URL}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE_URL}/ffmpeg-core.wasm`,
      });
      ffmpeg = instance;
      return instance;
    })().catch((error: unknown) => {
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

export async function muxAudioIntoVideo(video: Blob, audio: File): Promise<Blob> {
  const engine = await getFFmpeg();
  const audioExtension = audio.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
  const inputName = `source.${audioExtension}`;
  const outputName = 'voicemack-video.mp4';

  try {
    await engine.writeFile('generated-video.mp4', await fetchFile(video));
    await engine.writeFile(inputName, await fetchFile(audio));
    await engine.exec([
      '-stream_loop', '-1',
      '-i', 'generated-video.mp4',
      '-i', inputName,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-shortest',
      '-movflags', '+faststart',
      outputName,
    ]);

    const result = await engine.readFile(outputName);
    if (typeof result === 'string') throw new Error('Could not read the finished video.');
    const outputBuffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer;
    return new Blob([outputBuffer], { type: 'video/mp4' });
  } finally {
    await Promise.all(['generated-video.mp4', inputName, outputName].map((path) =>
      engine.deleteFile(path).catch(() => undefined)
    ));
  }
}

export async function compressAudioForAnalysis(audio: File): Promise<File> {
  const engine = await getFFmpeg();
  const audioExtension = audio.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
  const inputName = `analysis-source.${audioExtension}`;
  const outputName = 'analysis-audio.aac';

  try {
    await engine.writeFile(inputName, await fetchFile(audio));
    await engine.exec([
      '-i', inputName,
      '-vn',
      '-ac', '1',
      '-ar', '22050',
      '-c:a', 'aac',
      '-b:a', '24k',
      '-f', 'adts',
      outputName,
    ]);
    const result = await engine.readFile(outputName);
    if (typeof result === 'string') throw new Error('Could not prepare this audio for analysis.');
    if (result.byteLength > MAX_ANALYSIS_AUDIO_BYTES) {
      throw new Error('This audio is too long to analyze in one video request. Please trim it and try again.');
    }
    const outputBuffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer;
    return new File([outputBuffer], 'audio-analysis.aac', { type: 'audio/aac' });
  } finally {
    await Promise.all([inputName, outputName].map((path) =>
      engine.deleteFile(path).catch(() => undefined)
    ));
  }
}

export async function normalizeVoiceRecording(
  audio: File,
  minimumSeconds: number,
  maximumSeconds: number
): Promise<File> {
  const decoder = new AudioContext();
  let duration: number;
  try {
    const decoded = await decoder.decodeAudioData(await audio.arrayBuffer());
    duration = decoded.duration;
  } finally {
    await decoder.close();
  }

  if (duration < minimumSeconds || duration > maximumSeconds) {
    throw new Error(`Recording must be ${minimumSeconds}-${maximumSeconds} seconds long.`);
  }

  const engine = await getFFmpeg();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const audioExtension = audio.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
  const inputName = `voice-input-${suffix}.${audioExtension}`;
  const outputName = `voice-normalized-${suffix}.wav`;

  try {
    await engine.writeFile(inputName, await fetchFile(audio));
    await engine.exec([
      '-i', inputName,
      '-vn',
      '-ac', '1',
      '-ar', '24000',
      '-c:a', 'pcm_s16le',
      '-f', 'wav',
      outputName,
    ]);
    const result = await engine.readFile(outputName);
    if (typeof result === 'string') throw new Error('Could not prepare the voice recording.');
    const outputBuffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer;
    return new File([outputBuffer], outputName, { type: 'audio/wav' });
  } finally {
    await Promise.all([inputName, outputName].map((path) =>
      engine.deleteFile(path).catch(() => undefined)
    ));
  }
}