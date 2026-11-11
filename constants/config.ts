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
  return 'http://127.0.0.1:8000';
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
      shortName: 'Clara',
      badge: 'Warm · Female',
      genderHint: 'female',
      voiceLocale: 'en-US',
       voiceIndexOffset: 0,
      description: 'Warm, caring & natural best-friend tone',
      pitch: 1.08,
      defaultRate: 1.0,
      sampleText: "Hey there! I'm Clara, your warm and caring personal friend. How is your day going?",
      stylePrompt: 'Warm, supportive close friend who listens carefully and replies naturally.',
    },
    {
      id: 'bright-clear',
      name: 'Julian (Energetic Buddy)',
      shortName: 'Julian',
      badge: 'Upbeat · Male',
      genderHint: 'male',
      voiceLocale: 'en-US',
      voiceIndexOffset: 1,
      description: 'Deep, upbeat, quick & cheerful energy',
      pitch: 0.84,
      defaultRate: 1.08,
      sampleText: "Hey! I'm Julian. Ready to tackle anything together—what are we working on today?",
      stylePrompt: 'Upbeat, energetic, encouraging buddy with crisp, lively replies.',
    },
    {
      id: 'gentle-soft',
      name: 'Maya (Calm & Soothing)',
      shortName: 'Maya',
      badge: 'Soothing · UK',
      genderHint: 'female',
      voiceLocale: 'en-GB',
      voiceIndexOffset: 2,
      description: 'Soft, soothing British-accented mindfulness tone',
      pitch: 1.15,
      defaultRate: 0.93,
      sampleText: "Hello! I'm Maya. Take a slow breath—I'm right here whenever you want a calm chat.",
      stylePrompt: 'Calm, gentle, empathetic companion with a soothing, unhurried conversational style.',
    },
    {
      id: 'wise-mentor',
      name: 'Arjun (Friendly Mentor)',
      shortName: 'Arjun',
      badge: 'Grounded · IN',
      genderHint: 'male',
      voiceLocale: 'en-IN',
      voiceIndexOffset: 3,
      description: 'Rich, grounded Indian-English mentor voice',
      pitch: 0.78,
      defaultRate: 1.0,
      sampleText: "Namaste! I'm Arjun. Tell me what's on your mind and we'll figure it out step by step.",
      stylePrompt: 'Grounded, thoughtful, friendly mentor who gives clear, practical, encouraging advice.',
    },
    {
      id: 'spark-playful',
      name: 'Nova (Bright & Playful)',
      shortName: 'Nova',
      badge: 'Playful · AU',
      genderHint: 'female',
      voiceLocale: 'en-AU',
      voiceIndexOffset: 4,
      description: 'Bright, witty & fast-paced companion voice',
      pitch: 1.24,
      defaultRate: 1.12,
      sampleText: "Hiya! I'm Nova—quick, curious, and always ready for a fun conversation!",
      stylePrompt: 'Playful, witty, cheerful friend who keeps conversations light, fun, and super snappy.',
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
