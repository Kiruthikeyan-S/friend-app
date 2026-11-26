/**
 * Supabase Authentication Service
 * Real Email & Password Sign-Up, Sign-In, Session Persistence, and Sign-Out
 * using Supabase Auth (`/auth/v1`).
 */

import { DeviceIdentity } from '@/services/device';
import {
  AuthAttemptResult,
  AuthSession,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/user';

export interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SUPABASE_URL = 'https://yrwbsbkbbtnakiwtnxqx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_FcEXRQhJqSPXcMLPX6-Kow__4Bxkw2_';

function getAuthConfig() {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL)
    .trim()
    .replace(/\/+$/, '');
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  ).trim();
  return { url, anonKey };
}

function buildAuthHeaders(anonKey: string, token?: string): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
  };
}

export const AuthService = {
  validateLogin(credentials: LoginCredentials): ValidationErrors {
    const errors: ValidationErrors = {};
    const email = credentials.email.trim();

    if (!email) {
      errors.email = 'Please enter your email address.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address (e.g., alex@domain.com).';
    }

    if (!credentials.password) {
      errors.password = 'Please enter your password.';
    } else if (credentials.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    return errors;
  },

  validateRegistration(credentials: RegisterCredentials): ValidationErrors {
    const errors: ValidationErrors = {};
    const name = credentials.fullName.trim();
    const email = credentials.email.trim();

    if (!name) {
      errors.fullName = 'Please enter your name.';
    } else if (name.length < 2) {
      errors.fullName = 'Name must be at least 2 characters.';
    }

    if (!email) {
      errors.email = 'Please enter your email address.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!credentials.password) {
      errors.password = 'Please create a password.';
    } else if (credentials.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Za-z]/.test(credentials.password) || !/[0-9]/.test(credentials.password)) {
      errors.password = 'Include at least one letter and one number.';
    }

    if (credentials.confirmPassword !== credentials.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  },

  async signInWithEmail(credentials: LoginCredentials): Promise<AuthAttemptResult> {
    const errors = this.validateLogin(credentials);
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        requiresIntegration: false,
        message: 'Please fix the highlighted form fields before continuing.',
        phaseNote: 'Form validation failed',
      };
    }

    const { url, anonKey } = getAuthConfig();
    try {
      const response = await fetch(
        `${url}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: buildAuthHeaders(anonKey),
          body: JSON.stringify({
            email: credentials.email.trim(),
            password: credentials.password,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.access_token || !data?.user?.id) {
        const msg =
          data?.error_description ||
          data?.msg ||
          data?.message ||
          'Invalid email or password.';
        return {
          success: false,
          requiresIntegration: false,
          message: String(msg),
          phaseNote: 'Sign In Failed',
        };
      }

      const fullName =
        data.user?.user_metadata?.full_name ||
        credentials.email.trim().split('@')[0];

      const session: AuthSession = {
        accessToken: String(data.access_token),
        refreshToken: String(data.refresh_token || ''),
        userId: String(data.user.id),
        email: String(data.user.email || credentials.email.trim()),
        fullName: String(fullName),
      };

      DeviceIdentity.setActiveUserId(session.userId);
      await DeviceIdentity.saveAuthSession(session);

      return {
        success: true,
        requiresIntegration: false,
        message: `Welcome back, ${session.fullName}!`,
        phaseNote: 'Signed In',
        session,
      };
    } catch (err) {
      return {
        success: false,
        requiresIntegration: false,
        message:
          err instanceof Error
            ? `Network error: ${err.message}`
            : 'Unable to reach Supabase Auth.',
        phaseNote: 'Connection Error',
      };
    }
  },

  async registerWithEmail(credentials: RegisterCredentials): Promise<AuthAttemptResult> {
    const errors = this.validateRegistration(credentials);
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        requiresIntegration: false,
        message: 'Please fix the highlighted form fields before continuing.',
        phaseNote: 'Form validation failed',
      };
    }

    const { url, anonKey } = getAuthConfig();
    try {
      const response = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: buildAuthHeaders(anonKey),
        body: JSON.stringify({
          email: credentials.email.trim(),
          password: credentials.password,
          data: {
            full_name: credentials.fullName.trim(),
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          data?.msg ||
          data?.error_description ||
          data?.message ||
          'Could not create account.';
        return {
          success: false,
          requiresIntegration: false,
          message: String(msg),
          phaseNote: 'Registration Failed',
        };
      }

      // If email confirmation is disabled in Supabase, access_token is returned immediately
      if (data?.access_token && data?.user?.id) {
        const session: AuthSession = {
          accessToken: String(data.access_token),
          refreshToken: String(data.refresh_token || ''),
          userId: String(data.user.id),
          email: String(data.user.email || credentials.email.trim()),
          fullName: credentials.fullName.trim(),
        };
        DeviceIdentity.setActiveUserId(session.userId);
        await DeviceIdentity.saveAuthSession(session);

        return {
          success: true,
          requiresIntegration: false,
          message: `Account created for ${session.fullName}!`,
          phaseNote: 'Account Created',
          session,
        };
      }

      // Otherwise email confirmation link was sent
      return {
        success: false,
        requiresIntegration: false,
        message: `Account created for ${credentials.email.trim()}! Please check your email inbox to confirm your address, then Sign In.`,
        phaseNote: 'Confirm Your Email',
      };
    } catch (err) {
      return {
        success: false,
        requiresIntegration: false,
        message:
          err instanceof Error
            ? `Network error: ${err.message}`
            : 'Unable to reach Supabase Auth.',
        phaseNote: 'Connection Error',
      };
    }
  },

  async restoreSession(): Promise<AuthSession | null> {
    const saved = await DeviceIdentity.loadAuthSession<AuthSession>();
    if (!saved?.userId) return null;
    DeviceIdentity.setActiveUserId(saved.userId);
    return saved;
  },

  async signOut(): Promise<void> {
    const saved = await DeviceIdentity.loadAuthSession<AuthSession>();
    if (saved?.accessToken) {
      const { url, anonKey } = getAuthConfig();
      fetch(`${url}/auth/v1/logout`, {
        method: 'POST',
        headers: buildAuthHeaders(anonKey, saved.accessToken),
      }).catch(() => {});
    }
    await DeviceIdentity.clearAuthSession();
  },
};
