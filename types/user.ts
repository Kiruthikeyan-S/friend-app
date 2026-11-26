export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  authStatus: 'authenticated' | 'unauthenticated' | 'pending_firebase_integration';
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  fullName: string;
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
  session?: AuthSession;
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
