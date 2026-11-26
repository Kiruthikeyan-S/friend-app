/**
 * Supabase Cloud Persistence Service (HTTPS REST API)
 * Project: https://yrwbsbkbbtnakiwtnxqx.supabase.co
 * Strictly scoped per device (`deviceId`) so every device has its own isolated
 * memories and chat history—never shared across different users or phones.
 */

import { DeviceIdentity } from '@/services/device';
import { ChatMessage } from '@/types/chat';
import { MemoryItem, normalizeMemoryCategory } from '@/types/memory';

const DEFAULT_SUPABASE_URL = 'https://yrwbsbkbbtnakiwtnxqx.supabase.co';
// Publishable (client-safe) key — protected by Row Level Security on the database.
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_FcEXRQhJqSPXcMLPX6-Kow__4Bxkw2_';

const getSupabaseConfig = () => {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL)
    .trim()
    .replace(/\/+$/, '');
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  ).trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
};

function buildHeaders(
  anonKey: string,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

function scopeConversationId(deviceId: string, conversationId: string): string {
  const prefix = `${deviceId}::`;
  return conversationId.startsWith(prefix)
    ? conversationId
    : `${prefix}${conversationId}`;
}

function unscopeConversationId(deviceId: string, rawConversationId: string): string {
  const prefix = `${deviceId}::`;
  return rawConversationId.startsWith(prefix)
    ? rawConversationId.slice(prefix.length)
    : rawConversationId;
}

export const SupabaseService = {
  isConfigured(): boolean {
    return getSupabaseConfig().isConfigured;
  },

  async fetchApprovedMemories(): Promise<MemoryItem[] | null> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return null;

    try {
      const scopeId = await DeviceIdentity.getScopeId();
      const res = await fetch(
        `${url}/rest/v1/memories?select=id,category,title,content,approved,created_at&user_id=eq.${encodeURIComponent(scopeId)}&order=created_at.desc&limit=50`,
        {
          headers: buildHeaders(anonKey),
        }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      if (!Array.isArray(rows)) return null;

      return rows.map((row: Record<string, unknown>) => {
        const dateLabel = row.created_at
          ? new Date(String(row.created_at)).toLocaleDateString()
          : 'Synced from Supabase';
        return {
          id: String(row.id || `mem-${Date.now()}`),
          category: normalizeMemoryCategory(row.category),
          title: String(row.title || ''),
          content: String(row.content || ''),
          createdAt: dateLabel,
          updatedAt: dateLabel,
          explicitConsentGranted: Boolean(row.approved ?? true),
          consentedAt: `Synced (${dateLabel})`,
        };
      });
    } catch {
      return null;
    }
  },

  async upsertMemory(item: MemoryItem): Promise<boolean> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return false;

    try {
      const scopeId = await DeviceIdentity.getScopeId();
      const res = await fetch(`${url}/rest/v1/memories`, {
        method: 'POST',
        headers: buildHeaders(anonKey, {
          Prefer: 'resolution=merge-duplicates',
        }),
        body: JSON.stringify({
          id: item.id,
          user_id: scopeId,
          category: item.category,
          title: item.title,
          content: item.content,
          approved: item.explicitConsentGranted,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteMemory(id: string): Promise<boolean> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return false;

    try {
      const scopeId = await DeviceIdentity.getScopeId();
      const res = await fetch(
        `${url}/rest/v1/memories?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(scopeId)}`,
        {
          method: 'DELETE',
          headers: buildHeaders(anonKey),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchChatMessages(): Promise<ChatMessage[] | null> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return null;

    try {
      const scopeId = await DeviceIdentity.getScopeId();
      const pattern = `${scopeId}::*`;
      const res = await fetch(
        `${url}/rest/v1/messages?select=id,conversation_id,role,content,created_at&conversation_id=like.${encodeURIComponent(pattern)}&order=inserted_at.desc&limit=100`,
        {
          headers: buildHeaders(anonKey),
        }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      if (!Array.isArray(rows)) return null;

      return rows
        .reverse()
        .map((row: Record<string, unknown>) => ({
          id: String(row.id || `msg-${Date.now()}`),
          conversationId: unscopeConversationId(
            scopeId,
            String(row.conversation_id || 'live-session-1')
          ),
          role: row.role === 'user' ? 'user' : 'assistant',
          content: String(row.content || ''),
          createdAt: String(row.created_at || 'Synced'),
          isExamplePreview: false,
        }));
    } catch {
      return null;
    }
  },

  async insertChatMessage(message: ChatMessage): Promise<boolean> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return false;

    try {
      const scopeId = await DeviceIdentity.getScopeId();
      const res = await fetch(`${url}/rest/v1/messages`, {
        method: 'POST',
        headers: buildHeaders(anonKey, {
          Prefer: 'resolution=merge-duplicates',
        }),
        body: JSON.stringify({
          id: `${scopeId}::${message.id}`,
          conversation_id: scopeConversationId(scopeId, message.conversationId),
          role: message.role,
          content: message.content,
          created_at: message.createdAt,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async clearDeviceChatMessages(): Promise<boolean> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return false;

    try {
      const scopeId = await DeviceIdentity.getScopeId();
      const pattern = `${scopeId}::*`;
      const res = await fetch(
        `${url}/rest/v1/messages?conversation_id=like.${encodeURIComponent(pattern)}`,
        {
          method: 'DELETE',
          headers: buildHeaders(anonKey),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  },
};
