/**
 * Per-Device Identity & Private Local Database Storage
 * Guarantees each phone/device gets its own isolated device ID and local storage file,
 * so chat history, memories, and settings are never shared across different devices.
 */

import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const DEVICE_ID_FILENAME = 'aura_device_id.txt';
const LOCAL_DB_FILENAME = 'aura_private_db.json';
const AUTH_SESSION_FILENAME = 'aura_auth_session.json';
const WEB_DEVICE_KEY = 'aura_device_id_v1';
const WEB_DB_KEY = 'aura_private_db_v1';
const WEB_AUTH_KEY = 'aura_auth_session_v1';

let cachedDeviceId: string | null = null;
let deviceIdPromise: Promise<string> | null = null;
let activeAuthUserId: string | null = null;

function generateDeviceId(): string {
  const randA = Math.random().toString(36).slice(2, 10);
  const randB = Math.random().toString(36).slice(2, 10);
  return `dev-${Date.now().toString(36)}-${randA}${randB}`;
}

export const DeviceIdentity = {
  /**
   * Returns a persistent, unique ID for this specific device installation.
   */
  async getDeviceId(): Promise<string> {
    if (cachedDeviceId) {
      return cachedDeviceId;
    }
    if (deviceIdPromise) {
      return deviceIdPromise;
    }

    deviceIdPromise = (async () => {
      try {
        if (Platform.OS === 'web') {
          const existing =
            typeof window !== 'undefined'
              ? window.localStorage?.getItem(WEB_DEVICE_KEY)
              : null;
          if (existing && existing.trim()) {
            cachedDeviceId = existing.trim();
            return cachedDeviceId;
          }
          const created = generateDeviceId();
          if (typeof window !== 'undefined') {
            window.localStorage?.setItem(WEB_DEVICE_KEY, created);
          }
          cachedDeviceId = created;
          return created;
        }

        const dir = LegacyFileSystem.documentDirectory;
        if (dir) {
          const fileUri = `${dir}${DEVICE_ID_FILENAME}`;
          const info = await LegacyFileSystem.getInfoAsync(fileUri);
          if (info.exists) {
            const stored = (await LegacyFileSystem.readAsStringAsync(fileUri)).trim();
            if (stored) {
              cachedDeviceId = stored;
              return stored;
            }
          }
          const created = generateDeviceId();
          await LegacyFileSystem.writeAsStringAsync(fileUri, created);
          cachedDeviceId = created;
          return created;
        }
      } catch {
        // Fallback below if storage is unavailable
      }

      const fallback = generateDeviceId();
      cachedDeviceId = fallback;
      return fallback;
    })();

    return deviceIdPromise;
  },

  async saveLocalSnapshot(data: unknown): Promise<void> {
    try {
      const json = JSON.stringify(data);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem(WEB_DB_KEY, json);
        }
        return;
      }
      const dir = LegacyFileSystem.documentDirectory;
      if (dir) {
        await LegacyFileSystem.writeAsStringAsync(
          `${dir}${LOCAL_DB_FILENAME}`,
          json
        );
      }
    } catch {
      // Ignore storage write errors
    }
  },

  async saveAuthSession(session: unknown): Promise<void> {
    try {
      const json = JSON.stringify(session);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem(WEB_AUTH_KEY, json);
        }
        return;
      }
      const dir = LegacyFileSystem.documentDirectory;
      if (dir) {
        await LegacyFileSystem.writeAsStringAsync(
          `${dir}${AUTH_SESSION_FILENAME}`,
          json
        );
      }
    } catch {
      // Ignore storage write errors
    }
  },

  async loadAuthSession<T>(): Promise<T | null> {
    try {
      if (Platform.OS === 'web') {
        const raw =
          typeof window !== 'undefined'
            ? window.localStorage?.getItem(WEB_AUTH_KEY)
            : null;
        return raw ? (JSON.parse(raw) as T) : null;
      }
      const dir = LegacyFileSystem.documentDirectory;
      if (dir) {
        const fileUri = `${dir}${AUTH_SESSION_FILENAME}`;
        const info = await LegacyFileSystem.getInfoAsync(fileUri);
        if (!info.exists) return null;
        const raw = await LegacyFileSystem.readAsStringAsync(fileUri);
        return raw ? (JSON.parse(raw) as T) : null;
      }
    } catch {
      // Ignore storage read errors
    }
    return null;
  },

  async clearAuthSession(): Promise<void> {
    activeAuthUserId = null;
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem(WEB_AUTH_KEY);
        }
        return;
      }
      const dir = LegacyFileSystem.documentDirectory;
      if (dir) {
        await LegacyFileSystem.deleteAsync(`${dir}${AUTH_SESSION_FILENAME}`, {
          idempotent: true,
        });
      }
    } catch {
      // Ignore delete errors
    }
  },

  setActiveUserId(userId: string | null): void {
    activeAuthUserId = userId && userId.trim() ? `user-${userId.trim()}` : null;
  },

  /**
   * Returns the active account scope (`user-<id>`) when signed in,
   * or this phone's private device ID when in guest mode.
   */
  async getScopeId(): Promise<string> {
    if (activeAuthUserId) {
      return activeAuthUserId;
    }
    return this.getDeviceId();
  },

  async loadLocalSnapshot<T>(): Promise<T | null> {
    try {
      if (Platform.OS === 'web') {
        const raw =
          typeof window !== 'undefined'
            ? window.localStorage?.getItem(WEB_DB_KEY)
            : null;
        return raw ? (JSON.parse(raw) as T) : null;
      }
      const dir = LegacyFileSystem.documentDirectory;
      if (dir) {
        const fileUri = `${dir}${LOCAL_DB_FILENAME}`;
        const info = await LegacyFileSystem.getInfoAsync(fileUri);
        if (!info.exists) return null;
        const raw = await LegacyFileSystem.readAsStringAsync(fileUri);
        return raw ? (JSON.parse(raw) as T) : null;
      }
    } catch {
      // Ignore storage read errors
    }
    return null;
  },
};
