function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function encodeWav(audioBuffer: AudioBuffer): Blob {
  const channelCount = 2;
  const bytesPerSample = 2;
  const frameCount = audioBuffer.length;
  const buffer = new ArrayBuffer(44 + frameCount * channelCount * bytesPerSample);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeText(36, 'data');
  view.setUint32(40, frameCount * channelCount * bytesPerSample, true);

  const channels = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function mixSpeechWithMusic(
  speechBase64: string,
  music: Blob,
  musicVolume: number
): Promise<Blob> {
  const decoder = new AudioContext();

  try {
    const [speechBuffer, musicBuffer] = await Promise.all([
      decoder.decodeAudioData(decodeBase64(speechBase64)),
      decoder.decodeAudioData(await music.arrayBuffer()),
    ]);
    const sampleRate = speechBuffer.sampleRate;
    const frameCount = Math.ceil(speechBuffer.duration * sampleRate);
    const offline = new OfflineAudioContext(2, frameCount, sampleRate);

    const speechSource = offline.createBufferSource();
    speechSource.buffer = speechBuffer;
    speechSource.connect(offline.destination);
    speechSource.start(0);

    const musicSource = offline.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    const gain = offline.createGain();
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, musicVolume)), 0);
    musicSource.connect(gain);
    gain.connect(offline.destination);
    musicSource.start(0);

    return encodeWav(await offline.startRendering());
  } finally {
    await decoder.close();
  }
}

export function base64AudioToBlob(audioBase64: string, mimeType: string): Blob {
  return new Blob([decodeBase64(audioBase64)], { type: mimeType });
}