/**
 * Application Configuration
 * Automatically detects the development computer's LAN IP via `expo-constants`
 * so physical Android phones connect to FastAPI with zero manual setup.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const FALLBACK_LAN_IP = '10.126.188.90';

const getDefaultBackendUrl = (): string => {
  // 1. Automatically extract LAN IP from Expo Metro bundler hostUri if running on a physical device
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      ?.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000`;
    }
  }

  // 2. Environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 3. Platform fallback
  if (Platform.OS === 'android') {
    return `http://${FALLBACK_LAN_IP}:8000`;
  }
  return 'http://localhost:8000';
};

export const AppConfig = {
  appName: 'Aura',
  appSubtitle: 'Personal Voice Friend',
  version: '2.0 Live AI',
  currentPhase: 2,
  backendBaseUrl: getDefaultBackendUrl(),
  requestTimeoutMs: 18000,

  supportedLanguages: [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
    { code: 'es-ES', label: 'Español' },
    { code: 'fr-FR', label: 'Français' },
  ],

  voicePersonas: [
    {
      id: 'warm-calm',
      name: 'Clara (Warm Friend)',
      description: 'Warm, caring & natural tone',
      pitch: 1.05,
      defaultRate: 1.0,
      stylePrompt: 'Warm, supportive close friend who listens carefully and replies naturally.',
    },
    {
      id: 'bright-clear',
      name: 'Julian (Energetic)',
      description: 'Upbeat, quick & cheerful',
      pitch: 0.95,
      defaultRate: 1.08,
      stylePrompt: 'Upbeat, energetic, encouraging friend with crisp, lively replies.',
    },
    {
      id: 'gentle-soft',
      name: 'Maya (Calm & Thoughtful)',
      description: 'Soft, soothing & unhurried',
      pitch: 1.12,
      defaultRate: 0.94,
      stylePrompt: 'Calm, gentle, empathetic companion with a soothing conversational style.',
    },
  ],

  speechSpeeds: [
    { value: 0.9, label: '0.9x (Calm)' },
    { value: 1.0, label: '1.0x (Natural)' },
    { value: 1.12, label: '1.12x (Brisk)' },
    { value: 1.25, label: '1.25x (Fast)' },
  ],

  voicePitchPresets: [
    { value: 0.88, label: 'Deep (0.88)' },
    { value: 1.0, label: 'Natural (1.0)' },
    { value: 1.1, label: 'Warm (1.1)' },
    { value: 1.2, label: 'Bright (1.2)' },
  ],
} as const;
