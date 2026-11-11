/**
 * Voice, Microphone & Native Speech Service (`expo-audio` + `expo-speech`)
 *
 * - Real microphone permission & audio recording file -> base64 conversion
 * - Real spoken voice output via `expo-speech` with adjustable pitch, speed, and language
 */

import { AudioModule } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export type MicPermissionStatus = 'undetermined' | 'granted' | 'denied';

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
   * so it can be sent to the FastAPI Groq Whisper endpoint.
   */
  async readAudioUriAsBase64(uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read recorded audio file.'));
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Speaks text aloud through the device speaker using `expo-speech`.
   */
  speakText(
    text: string,
    options: {
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

    Speech.speak(cleanText, {
      language: options.language || 'en-US',
      pitch: options.pitch ?? 1.05,
      rate: options.rate ?? 1.0,
      onDone: options.onDone,
      onStopped: options.onStopped,
      onError: options.onError,
    });
  },

  stopSpeaking() {
    Speech.stop();
  },
};
