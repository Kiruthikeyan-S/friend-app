/**
 * Backend API Service Layer
 * Connects the React Native app to the Python FastAPI + Groq AI backend.
 */

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
  memories?: Array<{
    category: MemoryCategory;
    title: string;
    content: string;
    explicit_save?: boolean;
  }>;
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

async function fetchWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = AppConfig.requestTimeoutMs
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
    try {
      const data = await fetchWithTimeout<BackendHealthResponse>('/health', {}, 4000);
      return { online: data.status === 'healthy', data };
    } catch (err) {
      return {
        online: false,
        error: err instanceof Error ? err.message : 'Backend unreachable',
      };
    }
  },

  async sendChatMessage(
    message: string,
    conversationId: string,
    history: Array<{ role: string; content: string }>,
    approvedMemories: Array<{ category: string; title: string; content: string }> = [],
    voiceStyleNote?: string
  ): Promise<BackendChatResponse> {
    return fetchWithTimeout<BackendChatResponse>('/api/v1/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        history,
        approved_memories: approvedMemories,
        voice_style_note: voiceStyleNote,
      }),
    });
  },

  async sendVoiceTurn(payload: {
    audioBase64: string;
    filename?: string;
    mimeType?: string;
    language: string;
    history: Array<{ role: string; content: string }>;
    approvedMemories: Array<{ category: string; title: string; content: string }>;
    voiceStyleNote?: string;
  }): Promise<BackendVoiceTalkResponse> {
    return fetchWithTimeout<BackendVoiceTalkResponse>(
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
      22000
    );
  },

  async validateMemoryWithBackend(payload: {
    category: MemoryCategory;
    title: string;
    content: string;
    explicit_user_consent: boolean;
  }): Promise<BackendChatResponse> {
    return fetchWithTimeout<BackendChatResponse>('/api/v1/memory/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
