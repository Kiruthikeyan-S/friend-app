export type MemoryCategory = 'Profile' | 'Preferences' | 'Work' | 'Interests';

export type ExtendedMemoryCategory =
  | MemoryCategory
  | 'Communication preferences'
  | 'Learning interests'
  | 'Skills and experience'
  | 'Ongoing projects'
  | 'Frequently used preferences'
  | 'User-approved personal context';

/** Maps any casing or 6-category name to a valid MemoryCategory. */
export function normalizeMemoryCategory(raw: unknown): MemoryCategory {
  const value = String(raw ?? '').trim().toLowerCase();
  switch (value) {
    case 'profile':
    case 'user-approved personal context':
      return 'Profile';
    case 'work':
    case 'ongoing projects':
    case 'skills and experience':
      return 'Work';
    case 'interests':
    case 'learning interests':
      return 'Interests';
    case 'communication preferences':
    case 'frequently used preferences':
    case 'preferences':
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
