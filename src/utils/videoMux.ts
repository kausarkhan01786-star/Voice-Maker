import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
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