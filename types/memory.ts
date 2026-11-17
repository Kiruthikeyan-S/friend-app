export type MemoryCategory = 'Profile' | 'Preferences' | 'Work' | 'Interests';

/** Maps any casing ("profile", "PROFILE", "Profile") to the app's MemoryCategory. */
export function normalizeMemoryCategory(raw: unknown): MemoryCategory {
  const value = String(raw ?? '').trim().toLowerCase();
  switch (value) {
    case 'profile':
      return 'Profile';
    case 'work':
      return 'Work';
    case 'interests':
      return 'Interests';
    default:
      return 'Preferences';
  }
}

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  explicitConsentGranted: boolean;
  consentedAt: string;
}

export interface ExtractedMemoryCandidate {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  explicit_save?: boolean;
}

export interface MemoryPermissions {
  allowMemoryRequests: boolean;
  autoSaveSpokenMemories: boolean;
  requireExplicitConfirmationEveryTime: boolean;
  enabledCategories: Record<MemoryCategory, boolean>;
}

export interface MemoryDraft {
  category: MemoryCategory;
  title: string;
  content: string;
  explicitConsentGranted: boolean;
}
