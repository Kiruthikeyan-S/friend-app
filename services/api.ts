/**
 * Backend API Service Layer
 * Connects the React Native app to the unified, JWT-authenticated FastAPI backend
 * (`/api/v1/assistant/respond`). Zero AI provider keys are stored in the mobile app.
 */

import { AppConfig } from '@/constants/config';
import { DeviceIdentity } from '@/services/device';
import { ExtractedMemoryCandidate, MemoryCategory } from '@/types/memory';
import { AuthSession } from '@/types/user';

export interface BackendHealthResponse {
  status: string;
  service: string;
  version?: string;
  timestamp: string;
}

export interface BackendChatResponse {
  status: 'not_implemented' | 'ok' | 'error' | 'empty';
  intent?: string;
  message?: string;
  reply?: string;
  memories?: ExtractedMemoryCandidate[];
  model?: string;
  prompt_version?: string;
}

export interface BackendVoiceTalkResponse {
  status: 'ok' | 'empty' | 'error';
  intent?: string;
  transcript: string;
  reply: string;
  memories?: ExtractedMemoryCandidate[];
  model?: string;
  prompt_version?: string;
  message?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await DeviceIdentity.loadAuthSession<AuthSession>();
  if (session?.accessToken) {
    return {
      Authorization: `Bearer ${session.accessToken}`,
    };
  }
  return {};
}

async function fetchWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = AppConfig.requestTimeoutMs
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${AppConfig.backendBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
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
      const data = await fetchWithTimeout<BackendHealthResponse>(
        '/health',
        {},
        4000
      );
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
    return fetchWithTimeout<BackendChatResponse>(
      '/api/v1/assistant/respond',
      {
        method: 'POST',
        body: JSON.stringify({
          mode: 'text',
          conversation_id: conversationId,
          message,
          history,
          approved_memories: approvedMemories,
          voice_style_note: voiceStyleNote,
          is_temporary: true,
        }),
      },
      18000
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
    conversationId?: string;
  }): Promise<BackendVoiceTalkResponse> {
    return fetchWithTimeout<BackendVoiceTalkResponse>(
      '/api/v1/assistant/respond',
      {
        method: 'POST',
        body: JSON.stringify({
          mode: 'voice',
          conversation_id: payload.conversationId || 'voice-session',
          audio_base64: payload.audioBase64,
          filename: payload.filename || 'speech.m4a',
          mime_type: payload.mimeType || 'audio/m4a',
          language: payload.language,
          history: payload.history,
          approved_memories: payload.approvedMemories,
          voice_style_note: payload.voiceStyleNote,
          is_temporary: true,
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
