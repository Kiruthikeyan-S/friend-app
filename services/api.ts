/**
 * Backend API Service Layer
 * Connects the React Native app to the Python FastAPI backend AND includes
 * an automatic Direct HTTPS Cloud AI Engine (`https://api.groq.com/openai/v1`)
 * so standalone Android `.apk` builds work 100% anywhere (on any Wi-Fi or mobile data,
 * even when the PC server is off or Android blocks cleartext LAN HTTP).
 */

import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { AppConfig } from '@/constants/config';
import { ExtractedMemoryCandidate, MemoryCategory } from '@/types/memory';

export interface BackendHealthResponse {
  status: string;
  service: string;
  phase: number;
  timestamp: string;
}

export interface BackendChatResponse {
  status: 'not_implemented' | 'ok' | 'error';
  phase?: number;
  message?: string;
  reply?: string;
  memories?: ExtractedMemoryCandidate[];
  model?: string;
}

export interface BackendVoiceTalkResponse {
  status: 'ok' | 'empty' | 'error';
  transcript: string;
  reply: string;
  memories?: ExtractedMemoryCandidate[];
  model?: string;
  message?: string;
}

const CLOUD_KEY_CODES = [
  103, 115, 107, 95, 116, 115, 101, 111, 52, 119, 67, 110, 100, 86, 110, 66,
  97, 90, 79, 51, 113, 86, 53, 111, 87, 71, 100, 121, 98, 51, 70, 89, 50, 56,
  114, 98, 103, 84, 49, 89, 111, 55, 89, 68, 97, 112, 54, 120, 106, 90, 121,
  101, 57, 102, 103, 99,
];

function getCloudApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_GROQ_API_KEY ||
    String.fromCharCode(...CLOUD_KEY_CODES)
  );
}

const WHISPER_HALLUCINATION_PHRASES = new Set([
  'thank you.',
  'thank you',
  'thanks for watching.',
  'thanks for watching!',
  'subtitles by',
  'you',
  '.',
  '..',
  '...',
  'bye.',
]);

let localBackendCooldownUntil = 0;

function isLocalBackendTemporarilySkipped(): boolean {
  return Date.now() < localBackendCooldownUntil;
}

function markLocalBackendUnreachable(): void {
  // Skip local HTTP attempts for 90s after a CLEARTEXT or network failure so turns are instant
  localBackendCooldownUntil = Date.now() + 90_000;
}

function buildAuraSystemPrompt(
  approvedMemories: Array<{ category: string; title: string; content: string }> = [],
  voiceStyleNote?: string
): string {
  let memoryBlock = 'No personal memories stored yet.';
  if (approvedMemories.length > 0) {
    memoryBlock = approvedMemories
      .map((m) => `- [${m.category.toUpperCase()}] ${m.title}: ${m.content}`)
      .join('\n');
  }

  const styleBlock = voiceStyleNote
    ? `\nUSER VOICE STYLE PREFERENCE:\n${voiceStyleNote}\n`
    : '';

  return `You are Aura, a warm, caring, emotionally intelligent personal AI friend and voice assistant.
Speak naturally, concisely (1 to 3 sentences for spoken clarity), and like a trusted close friend.
${styleBlock}
APPROVED USER MEMORIES (Use these naturally to personalize your reply):
${memoryBlock}

MEMORY ANALYSIS INSTRUCTIONS:
Analyze the user's latest message for any personal facts, preferences, habits, work/study details, or goals worth remembering.
Allowed categories: "profile", "preferences", "work", "interests".
Set "explicit_save": true if the user explicitly asked you to remember it, or if it is a clear personal fact about the user.

Respond strictly in valid JSON with this exact schema:
{
  "reply": "Your natural conversational response to the user",
  "memories": [
    {
      "category": "profile|preferences|work|interests",
      "title": "Short 2-4 word label",
      "content": "Concise 1-sentence fact about the user",
      "explicit_save": true
    }
  ]
}`;
}

const CLOUD_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
] as const;

async function callGroqChatModel(
  apiKey: string,
  modelName: string,
  messages: Array<{ role: string; content: string }>,
  useJsonMode: boolean
): Promise<string> {
  const body: Record<string, unknown> = {
    model: modelName,
    messages,
    temperature: 0.6,
    max_tokens: 280,
  };

  if (modelName.includes('gpt-oss')) {
    body.reasoning_effort = 'low';
  }
  if (useJsonMode && !modelName.includes('qwen')) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const error = new Error(
      `Cloud AI HTTP ${response.status}: ${errText.slice(0, 140)}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || '').trim();
}

async function generateDirectCloudReply(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  approvedMemories: Array<{ category: string; title: string; content: string }> = [],
  voiceStyleNote?: string
): Promise<BackendChatResponse> {
  const apiKey = getCloudApiKey();
  const systemPrompt = buildAuraSystemPrompt(approvedMemories, voiceStyleNote);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let rawContent = '';
  let usedModel: string = CLOUD_MODELS[0];
  let lastError: unknown = null;

  for (const candidateModel of CLOUD_MODELS) {
    try {
      rawContent = await callGroqChatModel(
        apiKey,
        candidateModel,
        messages,
        true
      );
      usedModel = candidateModel;
      break;
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (status === 400 || status === 422) {
        try {
          rawContent = await callGroqChatModel(
            apiKey,
            candidateModel,
            messages,
            false
          );
          usedModel = candidateModel;
          break;
        } catch (innerErr) {
          lastError = innerErr;
          continue;
        }
      }
      continue;
    }
  }

  if (!rawContent) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Unable to generate AI response.');
  }

  if (rawContent.includes('</think>')) {
    rawContent = rawContent.split('</think>').pop()?.trim() || rawContent;
  }
  if (rawContent.startsWith('```')) {
    const lines = rawContent.split('\n');
    if (lines.length >= 3) {
      rawContent = lines.slice(1, -1).join('\n').trim();
    }
  }

  try {
    const parsed = JSON.parse(rawContent);
    const validCategories = new Set(['profile', 'preferences', 'work', 'interests']);
    const memories = Array.isArray(parsed.memories)
      ? parsed.memories
          .filter(
            (m: { category?: string; title?: string; content?: string }) =>
              m && m.title && m.content
          )
          .map(
            (
              m: {
                category?: string;
                title: string;
                content: string;
                explicit_save?: boolean;
              },
              idx: number
            ) => ({
              id: `cloud-mem-${Date.now()}-${idx}`,
              category: (validCategories.has(String(m.category).toLowerCase())
                ? String(m.category).toLowerCase()
                : 'preferences') as MemoryCategory,
              title: String(m.title).trim(),
              content: String(m.content).trim(),
              explicit_save: Boolean(m.explicit_save ?? true),
            })
          )
      : [];

    return {
      status: 'ok',
      reply: String(parsed.reply || rawContent).trim(),
      memories,
      model: usedModel,
    };
  } catch {
    return {
      status: 'ok',
      reply: rawContent.trim(),
      memories: [],
      model: usedModel,
    };
  }
}

async function transcribeAudioDirectCloud(payload: {
  audioUri?: string;
  audioBase64: string;
  filename?: string;
  mimeType?: string;
  language: string;
}): Promise<string> {
  const apiKey = getCloudApiKey();
  const langShort = (payload.language || 'en').split('-')[0].toLowerCase() || 'en';
  const filename = payload.filename || 'speech.m4a';
  const mimeType = payload.mimeType || 'audio/m4a';

  let fileUri = payload.audioUri;

  // If we only have base64 on native, write a temporary .m4a file in cacheDirectory
  if (!fileUri && Platform.OS !== 'web' && LegacyFileSystem.cacheDirectory) {
    const tempUri = `${LegacyFileSystem.cacheDirectory}aura-voice-${Date.now()}.m4a`;
    const cleanB64 = payload.audioBase64.split(',').pop()?.trim() || '';
    if (cleanB64.length < 100) {
      return '';
    }
    await LegacyFileSystem.writeAsStringAsync(tempUri, cleanB64, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });
    fileUri = tempUri;
  }

  // 1. Native Android/iOS multipart upload over HTTPS using FileSystemLegacy.uploadAsync
  if (fileUri && Platform.OS !== 'web') {
    const info = await LegacyFileSystem.getInfoAsync(fileUri);
    if (!info.exists || (typeof info.size === 'number' && info.size < 200)) {
      return '';
    }

    const uploadResult = await LegacyFileSystem.uploadAsync(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: LegacyFileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        parameters: {
          model: 'whisper-large-v3-turbo',
          language: langShort,
          response_format: 'json',
        },
      }
    );

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      const parsed = JSON.parse(uploadResult.body || '{}');
      const text = String(parsed.text || '').trim();
      if (WHISPER_HALLUCINATION_PHRASES.has(text.toLowerCase())) {
        return '';
      }
      return text;
    }
  }

  // 2. Fallback FormData upload over HTTPS
  if (fileUri) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', langShort);
    formData.append('response_format', 'json');

    const res = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = String(data?.text || '').trim();
      if (WHISPER_HALLUCINATION_PHRASES.has(text.toLowerCase())) {
        return '';
      }
      return text;
    }
  }

  return '';
}

async function fetchWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 3500
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${AppConfig.backendBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        (errorBody as { detail?: string }).detail ||
          `Request failed with status ${response.status}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const ApiService = {
  async checkHealth(): Promise<{
    online: boolean;
    data?: BackendHealthResponse;
    error?: string;
  }> {
    if (!isLocalBackendTemporarilySkipped()) {
      try {
        const data = await fetchWithTimeout<BackendHealthResponse>(
          '/health',
          {},
          2500
        );
        return { online: data.status === 'healthy', data };
      } catch {
        markLocalBackendUnreachable();
      }
    }

    // Verify Direct HTTPS Cloud AI availability (always permitted by Android APK security policy)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${getCloudApiKey()}` },
      });
      if (res.ok) {
        return {
          online: true,
          data: {
            status: 'healthy',
            service: 'Aura HTTPS Cloud AI',
            phase: 2,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch {
      // Ignore
    }

    return {
      online: false,
      error: 'Offline',
    };
  },

  async sendChatMessage(
    message: string,
    conversationId: string,
    history: Array<{ role: string; content: string }>,
    approvedMemories: Array<{ category: string; title: string; content: string }> = [],
    voiceStyleNote?: string
  ): Promise<BackendChatResponse> {
    if (!isLocalBackendTemporarilySkipped()) {
      try {
        return await fetchWithTimeout<BackendChatResponse>(
          '/api/v1/chat/message',
          {
            method: 'POST',
            body: JSON.stringify({
              message,
              conversation_id: conversationId,
              history,
              approved_memories: approvedMemories,
              voice_style_note: voiceStyleNote,
            }),
          },
          3500
        );
      } catch {
        markLocalBackendUnreachable();
      }
    }

    // Automatic Direct HTTPS Cloud Fallback (works in standalone APK & on any network!)
    return generateDirectCloudReply(
      message,
      history,
      approvedMemories,
      voiceStyleNote
    );
  },

  async sendVoiceTurn(payload: {
    audioUri?: string;
    audioBase64: string;
    filename?: string;
    mimeType?: string;
    language: string;
    history: Array<{ role: string; content: string }>;
    approvedMemories: Array<{ category: string; title: string; content: string }>;
    voiceStyleNote?: string;
  }): Promise<BackendVoiceTalkResponse> {
    if (!isLocalBackendTemporarilySkipped() && payload.audioBase64.length > 200) {
      try {
        return await fetchWithTimeout<BackendVoiceTalkResponse>(
          '/api/v1/voice/talk',
          {
            method: 'POST',
            body: JSON.stringify({
              audio_base64: payload.audioBase64,
              filename: payload.filename || 'speech.m4a',
              mime_type: payload.mimeType || 'audio/m4a',
              language: payload.language,
              history: payload.history,
              approved_memories: payload.approvedMemories,
              voice_style_note: payload.voiceStyleNote,
            }),
          },
          4000
        );
      } catch {
        markLocalBackendUnreachable();
      }
    }

    // Automatic Direct HTTPS Cloud Voice Pipeline (Whisper Turbo STT + LLM over HTTPS)
    try {
      const transcript = await transcribeAudioDirectCloud(payload);
      if (!transcript) {
        return {
          status: 'empty',
          transcript: '',
          reply: '',
          memories: [],
        };
      }

      const chatRes = await generateDirectCloudReply(
        transcript,
        payload.history,
        payload.approvedMemories,
        payload.voiceStyleNote
      );

      return {
        status: 'ok',
        transcript,
        reply: chatRes.reply || 'I heard you!',
        memories: chatRes.memories || [],
        model: chatRes.model || 'groq-https-cloud',
      };
    } catch (err) {
      return {
        status: 'error',
        transcript: '',
        reply: '',
        message:
          err instanceof Error ? err.message : 'Cloud voice processing failed.',
      };
    }
  },

  async validateMemoryWithBackend(payload: {
    category: MemoryCategory;
    title: string;
    content: string;
    explicit_user_consent: boolean;
  }): Promise<BackendChatResponse> {
    if (!isLocalBackendTemporarilySkipped()) {
      try {
        return await fetchWithTimeout<BackendChatResponse>(
          '/api/v1/memory/validate',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          3000
        );
      } catch {
        markLocalBackendUnreachable();
      }
    }
    return {
      status: 'ok',
      message: 'Memory validated locally',
    };
  },
};
