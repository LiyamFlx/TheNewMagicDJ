export function generateWavDataUrl(frequency: number = 440, durationSeconds: number = 12): string {
  const sampleRate = 22050;
  const samples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const fade = Math.min(1, Math.min(t / 0.1, (durationSeconds - t) / 0.1));
    const f1 = Math.sin(2 * Math.PI * frequency * t);
    const f2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3;
    const rhythm = (Math.floor(t * 2) % 2) * 0.1 + 0.9;
    const sample = (f1 + f2) * fade * rhythm * 0.6;
    const intSample = Math.max(-32767, Math.min(32767, sample * 32767));
    view.setInt16(44 + i * 2, intSample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

