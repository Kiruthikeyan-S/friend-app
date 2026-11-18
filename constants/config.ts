/**
 * Application Configuration
 * Automatically detects the development computer's LAN IP via `expo-constants`
 * so physical Android phones connect to FastAPI with zero manual setup.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const FALLBACK_LAN_IP = '192.168.88.4';

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
  appName: 'Anytime Anywhere Chat',
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
      name: 'Clara (Warm Voice)',
      shortName: 'Clara',
      badge: 'Warm · Smooth',
      genderHint: 'female',
      voiceLocale: 'en-US',
      voiceIndexOffset: 0,
      description: 'Smooth, warm & natural conversational voice',
      pitch: 1.05,
      defaultRate: 0.96,
      sampleText: "Hey there! I'm Clara, your warm and smooth voice assistant. How is your day going?",
      stylePrompt: 'Warm, supportive close friend who listens carefully and replies naturally.',
    },
    {
      id: 'bright-clear',
      name: 'Julian (Deep & Clear)',
      shortName: 'Julian',
      badge: 'Deep · Smooth',
      genderHint: 'male',
      voiceLocale: 'en-US',
      voiceIndexOffset: 1,
      description: 'Smooth, deep & clear conversational voice',
      pitch: 0.74,
      defaultRate: 1.00,
      sampleText: "Hey! I'm Julian. Ready to help you with anything today—what's on your mind?",
      stylePrompt: 'Upbeat, encouraging buddy with crisp, friendly replies.',
    },
    {
      id: 'gentle-soft',
      name: 'Maya (Soft & Calm)',
      shortName: 'Maya',
      badge: 'Soft · Calm',
      genderHint: 'female',
      voiceLocale: 'en-US',
      voiceIndexOffset: 2,
      description: 'Soft, gentle & unhurried soothing voice',
      pitch: 1.18,
      defaultRate: 0.90,
      sampleText: "Hello! I'm Maya. Take a slow breath—I'm right here whenever you want a calm chat.",
      stylePrompt: 'Calm, gentle, empathetic companion with a soothing, unhurried conversational style.',
    },
    {
      id: 'wise-mentor',
      name: 'Arjun (Rich & Grounded)',
      shortName: 'Arjun',
      badge: 'Rich · Steady',
      genderHint: 'male',
      voiceLocale: 'en-US',
      voiceIndexOffset: 3,
      description: 'Rich, steady & grounded conversational voice',
      pitch: 0.84,
      defaultRate: 0.94,
      sampleText: "Hey! I'm Arjun. Tell me what's on your mind and we'll figure it out step by step.",
      stylePrompt: 'Grounded, thoughtful, friendly mentor who gives clear, practical, encouraging advice.',
    },
    {
      id: 'spark-playful',
      name: 'Nova (Bright & Lively)',
      shortName: 'Nova',
      badge: 'Bright · Smooth',
      genderHint: 'female',
      voiceLocale: 'en-US',
      voiceIndexOffset: 4,
      description: 'Bright, smooth & lively companion voice',
      pitch: 1.28,
      defaultRate: 1.06,
      sampleText: "Hi! I'm Nova—bright, smooth, and always ready for a great conversation!",
      stylePrompt: 'Playful, witty, cheerful friend who keeps conversations light, fun, and natural.',
    },
  ],

  speechSpeeds: [
    { value: 0.88, label: '0.88x (Slow & Smooth)' },
    { value: 0.96, label: '0.96x (Smooth Natural)' },
    { value: 1.04, label: '1.04x (Brisk)' },
    { value: 1.14, label: '1.14x (Fast)' },
  ],

  voicePitchPresets: [
    { value: 0.88, label: 'Deep (0.88)' },
    { value: 0.96, label: 'Warm Low (0.96)' },
    { value: 1.03, label: 'Smooth (1.03)' },
    { value: 1.10, label: 'Bright (1.10)' },
  ],
} as const;
