/**
 * Voice, Microphone & Native Speech Service (`expo-audio` + `expo-speech`)
 *
 * - Real microphone permission & audio recording file -> base64 conversion
 * - Real spoken voice output via `expo-speech` with adjustable pitch, speed, and language
 */

import { AudioModule } from 'expo-audio';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { requireNativeModule } from 'expo-modules-core';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { AppConfig } from '@/constants/config';

export type MicPermissionStatus = 'undetermined' | 'granted' | 'denied';

let cachedSystemVoices: Speech.Voice[] = [];
let voicesLoaded = false;

async function ensureSystemVoicesLoaded(): Promise<Speech.Voice[]> {
  if (voicesLoaded && cachedSystemVoices.length > 0) {
    return cachedSystemVoices;
  }
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (Array.isArray(voices) && voices.length > 0) {
      cachedSystemVoices = voices;
      voicesLoaded = true;
    }
  } catch {
    // Ignore if unavailable on current platform
  }
  return cachedSystemVoices;
}

// Preload device voices in the background
ensureSystemVoicesLoaded();

/**
 * Picks a distinct native device voice for the given persona if the OS exposes multiple voices,
 * while also using the persona's accent locale, pitch, and speech rate.
 */
function pickDeviceVoiceForPersona(
  personaId: string | undefined,
  preferredLanguage?: string
): { voiceIdentifier?: string; language: string; pitch: number; rate: number } {
  const persona =
    AppConfig.voicePersonas.find((p) => p.id === personaId) ||
    AppConfig.voicePersonas[0];

  const targetLang =
    preferredLanguage && preferredLanguage !== 'en-US'
      ? preferredLanguage
      : persona.voiceLocale || 'en-US';

  if (cachedSystemVoices.length === 0) {
    return {
      language: targetLang,
      pitch: persona.pitch,
      rate: persona.defaultRate,
    };
  }

  // Filter out uninstalled Android '-network' voices; prefer local offline voices
  const availableVoices =
    Platform.OS === 'android'
      ? cachedSystemVoices.filter(
          (v) => !String(v.identifier || '').toLowerCase().includes('-network')
        )
      : cachedSystemVoices;

  const usableVoices =
    availableVoices.length > 0 ? availableVoices : cachedSystemVoices;

  // Filter voices matching the language prefix (e.g. 'en')
  const langPrefix = targetLang.split('-')[0].toLowerCase();
  const exactLocaleVoices = usableVoices.filter(
    (v) => v.language?.toLowerCase() === targetLang.toLowerCase()
  );
  const familyVoices = usableVoices.filter((v) =>
    v.language?.toLowerCase().startsWith(langPrefix)
  );

  const pool =
    exactLocaleVoices.length > 0
      ? exactLocaleVoices
      : familyVoices.length > 0
      ? familyVoices
      : usableVoices;

  // Try to match gender keywords in voice name/identifier if available on Android/iOS
  const maleKeywords = ['male', 'david', 'mark', 'james', 'daniel', 'rishi', 'arjun', 'iom', 'tpd', 'guy'];
  const femaleKeywords = ['female', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'veena', 'sfg', 'sfb'];

  const genderFiltered = pool.filter((v) => {
    const label = `${v.name || ''} ${v.identifier || ''}`.toLowerCase();
    if (persona.genderHint === 'male') {
      return maleKeywords.some((k) => label.includes(k));
    }
    return femaleKeywords.some((k) => label.includes(k));
  });

  const finalPool = genderFiltered.length > 0 ? genderFiltered : pool;
  const chosenVoice =
    finalPool[persona.voiceIndexOffset % finalPool.length];

  return {
    voiceIdentifier: chosenVoice?.identifier,
    language: chosenVoice?.language || targetLang,
    pitch: persona.pitch,
    rate: persona.defaultRate,
  };
}

export const VoiceService = {
  async getMicrophonePermission(): Promise<MicPermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        return 'granted';
      }
      const status = await AudioModule.getRecordingPermissionsAsync();
      if (status.granted) {
        return 'granted';
      }
      return status.canAskAgain ? 'undetermined' : 'denied';
    } catch {
      return 'undetermined';
    }
  },

  async requestMicrophonePermission(): Promise<MicPermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        return 'granted';
      }
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) {
        return 'granted';
      }
      return 'denied';
    } catch {
      return 'denied';
    }
  },

  /**
   * Reads a local recorded audio URI (`file://...`) into a base64 string
   * using native `expo-file-system/legacy` (`readAsStringAsync` in Kotlin) and
   * native `FileSystemFile(uri).base64()` (bypassing JS `Paths.join` URL bug).
   */
  async readAudioUriAsBase64(uri: string): Promise<string> {
    if (Platform.OS !== 'web') {
      // 1. Primary native path: FileSystemLegacyModule.readAsStringAsync (Kotlin FileInputStream -> Base64)
      try {
        const b64Legacy = await LegacyFileSystem.readAsStringAsync(uri, {
          encoding: LegacyFileSystem.EncodingType.Base64,
        });
        if (b64Legacy && b64Legacy.length > 0) {
          return b64Legacy;
        }
      } catch {
        // Continue to next native reader
      }

      // 2. Secondary native path: Direct Native FileSystemFile constructor (bypasses JS Paths.join)
      try {
        const NativeFS = requireNativeModule<{
          FileSystemFile: new (fileUri: string) => {
            base64: () => Promise<string>;
          };
        }>('FileSystem');
        if (NativeFS?.FileSystemFile) {
          const rawFile = new NativeFS.FileSystemFile(uri);
          const b64Direct = await rawFile.base64();
          if (b64Direct && b64Direct.length > 0) {
            return b64Direct;
          }
        }
      } catch {
        // Fallback to fetch + FileReader below if needed
      }
    }

    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () =>
        reject(new Error('Failed to read recorded audio file.'));
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Speaks text aloud through the device speaker using `expo-speech`
   * with support for 5 distinct Agent Voice Personas.
   */
  speakText(
    text: string,
    options: {
      personaId?: string;
      language?: string;
      pitch?: number;
      rate?: number;
      onDone?: () => void;
      onStopped?: () => void;
      onError?: () => void;
    } = {}
  ) {
    Speech.stop();
    const cleanText = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_`~[\]()]/g, ' ')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) {
      options.onDone?.();
      return;
    }

    const resolved = pickDeviceVoiceForPersona(
      options.personaId,
      options.language
    );

    const targetPitch = options.pitch ?? resolved.pitch;
    const targetRate = options.rate ?? resolved.rate;
    // Allow clearly distinct vocal pitch & speed per persona (0.70..1.32 pitch)
    const smoothPitch = Math.max(0.70, Math.min(1.32, targetPitch));
    const smoothRate = Math.max(0.84, Math.min(1.16, targetRate));
    // On Android, SpeechModule.kt uses Locale.Builder().setLanguage(it).build() which requires
    // a 2-letter ISO 639 code ('en', 'hi', 'es', 'fr').
    const androidSafeLang = (options.language || resolved.language || 'en')
      .split('-')[0]
      .toLowerCase();

    Speech.speak(cleanText, {
      voice: resolved.voiceIdentifier,
      language: Platform.OS === 'android' ? androidSafeLang : resolved.language,
      pitch: smoothPitch,
      rate: smoothRate,
      onDone: options.onDone,
      onStopped: options.onStopped,
      onError: () => {
        // Fallback with system default voice + distinct pitch/rate if local voice ID fails
        Speech.speak(cleanText, {
          language: Platform.OS === 'android' ? androidSafeLang : resolved.language,
          pitch: smoothPitch,
          rate: smoothRate,
          onDone: options.onDone,
          onStopped: options.onStopped,
          onError: options.onError,
        });
      },
    });
  },

  stopSpeaking() {
    Speech.stop();
  },
};
