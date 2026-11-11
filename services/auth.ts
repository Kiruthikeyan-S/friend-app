/**
 * Authentication Service Foundation (Prepared for Phase 6 Firebase Authentication)
 *
 * IMPORTANT REQUIREMENT:
 * Does NOT implement fake authentication or pretend a user is logged in.
 * Performs thorough client-side validation and clearly reports Phase 6 Firebase readiness.
 */

import {
  AuthAttemptResult,
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

  /**
   * Prepared entry point for Firebase `signInWithEmailAndPassword`.
   * Never fakes a session token in Phase 1.
   */
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

    // Honest Phase 6 status — no fake login state
    return {
      success: false,
      requiresIntegration: true,
      message:
        'Form validation passed for ' +
        credentials.email.trim() +
        '. Firebase Authentication is not yet connected in Phase 1 (scheduled for Phase 6).',
      phaseNote: 'Awaiting Phase 6: Firebase Auth SDK Integration',
    };
  },

  /**
   * Prepared entry point for Firebase `createUserWithEmailAndPassword`.
   * Never fakes account creation in Phase 1.
   */
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

    return {
      success: false,
      requiresIntegration: true,
      message:
        `Credentials validated for ${credentials.fullName.trim()} (${credentials.email.trim()}). ` +
        'Account creation requires Firebase Authentication (scheduled for Phase 6).',
      phaseNote: 'Awaiting Phase 6: Firebase Auth SDK Integration',
    };
  },
};
