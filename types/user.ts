export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  authStatus: 'unauthenticated' | 'pending_firebase_integration';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthAttemptResult {
  success: boolean;
  requiresIntegration: boolean;
  message: string;
  phaseNote: string;
}

export interface VoiceSettings {
  selectedVoiceId: string;
  languageCode: string;
  speechSpeed: number;
  voicePitch: number;
  customStylePrompt: string;
  continuousMode: boolean;
  autoPlayAssistantVoice: boolean;
}
