export type MemoryCategory = 'Profile' | 'Preferences' | 'Work' | 'Interests';

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
