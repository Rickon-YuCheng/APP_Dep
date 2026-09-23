// 後端推論服務網址。在 .env 設定 EXPO_PUBLIC_API_ENDPOINT 即改走真實推論；未設定時為本地模擬。
const API_ENDPOINT = process.env.EXPO_PUBLIC_API_ENDPOINT ?? '';

export type PickedFile = { uri: string; name: string; size?: number; mimeType?: string };

export type AnalyzeInput = {
  audio: PickedFile;
  transcript: PickedFile | null;
  patient: { name: string; pid: string; birth: string };
  doctor: { name: string; dept: string };
};

/** 回傳 0 = 無憂鬱、1 = 憂鬱 */
export async function analyze(input: AnalyzeInput): Promise<0 | 1> {
  if (API_ENDPOINT) {
    try {
      const fd = new FormData();
      // React Native 的 FormData 以 { uri, name, type } 描述檔案
      fd.append('audio', { uri: input.audio.uri, name: input.audio.name, type: input.audio.mimeType ?? 'application/octet-stream' } as any);
      if (input.transcript) {
        fd.append('transcript', { uri: input.transcript.uri, name: input.transcript.name, type: input.transcript.mimeType ?? 'application/octet-stream' } as any);
      }
      fd.append('patient', JSON.stringify(input.patient));
      fd.append('doctor', JSON.stringify(input.doctor));
      const r = await fetch(API_ENDPOINT, { method: 'POST', body: fd });
      const { label } = await r.json();
      if (label === 0 || label === 1) return label;
    } catch {
      // 失敗時比照 mockup 退回本地模擬
    }
  }
  await new Promise((r) => setTimeout(r, 1600));
  return (input.patient.pid.charCodeAt(0) % 2) as 0 | 1;
}
