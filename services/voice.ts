/**
 * Voice, Microphone & Native Speech Service (`expo-audio` + `expo-speech`)
 *
 * - Real microphone permission & audio recording file -> base64 conversion
 * - Real spoken voice output via `expo-speech` with adjustable pitch, speed, and language
 */

import { AudioModule } from 'expo-audio';
import { File } from 'expo-file-system';
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

  // Filter voices matching the language prefix (e.g. 'en')
  const langPrefix = targetLang.split('-')[0].toLowerCase();
  const exactLocaleVoices = cachedSystemVoices.filter(
    (v) => v.language?.toLowerCase() === targetLang.toLowerCase()
  );
  const familyVoices = cachedSystemVoices.filter((v) =>
    v.language?.toLowerCase().startsWith(langPrefix)
  );

  const pool =
    exactLocaleVoices.length > 0
      ? exactLocaleVoices
      : familyVoices.length > 0
      ? familyVoices
      : cachedSystemVoices;

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
   * using native `expo-file-system` JSI (`new File(uri).base64()`) on Android/iOS
   * so the complete `.m4a` recording is sent to FastAPI Whisper STT reliably.
   */
  async readAudioUriAsBase64(uri: string): Promise<string> {
    if (Platform.OS !== 'web') {
      try {
        const nativeFile = new File(uri);
        const b64 = await nativeFile.base64();
        if (b64 && b64.length > 64) {
          return b64;
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
    const cleanText = text.replace(/[*#_`~]/g, '').trim();
    if (!cleanText) {
      options.onDone?.();
      return;
    }

    const resolved = pickDeviceVoiceForPersona(
      options.personaId,
      options.language
    );

    Speech.speak(cleanText, {
      voice: resolved.voiceIdentifier,
      language: resolved.language,
      pitch: options.pitch ?? resolved.pitch,
      rate: options.rate ?? resolved.rate,
      onDone: options.onDone,
      onStopped: options.onStopped,
      onError: options.onError,
    });
  },

  stopSpeaking() {
    Speech.stop();
  },
};
