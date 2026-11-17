/**
 * Supabase Cloud Persistence Service (HTTPS REST API)
 * Project: https://yrwbsbkbbtnakiwtnxqx.supabase.co
 * Works in Expo Go, Web, and standalone Android `.apk` builds with zero native dependencies.
 * Automatically syncs approved Personal Memories (Phase 7) and Chat Messages (Phase 8).
 */

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

export const SupabaseService = {
  isConfigured(): boolean {
    return getSupabaseConfig().isConfigured;
  },

  async fetchApprovedMemories(): Promise<MemoryItem[] | null> {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (!isConfigured) return null;

    try {
      const res = await fetch(
        `${url}/rest/v1/memories?select=id,category,title,content,approved,created_at&order=created_at.desc&limit=50`,
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
      const res = await fetch(`${url}/rest/v1/memories`, {
        method: 'POST',
        headers: buildHeaders(anonKey, {
          Prefer: 'resolution=merge-duplicates',
        }),
        body: JSON.stringify({
          id: item.id,
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
      const res = await fetch(
        `${url}/rest/v1/memories?id=eq.${encodeURIComponent(id)}`,
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
      const res = await fetch(
        `${url}/rest/v1/messages?select=id,conversation_id,role,content,created_at&order=inserted_at.desc&limit=100`,
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
          conversationId: String(row.conversation_id || 'live-session-1'),
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
      const res = await fetch(`${url}/rest/v1/messages`, {
        method: 'POST',
        headers: buildHeaders(anonKey, {
          Prefer: 'resolution=merge-duplicates',
        }),
        body: JSON.stringify({
          id: message.id,
          conversation_id: message.conversationId,
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
};
