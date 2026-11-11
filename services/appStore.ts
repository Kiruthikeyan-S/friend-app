/**
 * Shared Application State Store
 * Synchronizes Live Chat, Voice Conversations, Extracted Memory Suggestions,
 * Consent-Based Personal Memories, and Voice Training Settings.
 */

import { useEffect, useState } from 'react';
import { AppConfig } from '@/constants/config';
import { ChatMessage, ChatMode, ConversationSession } from '@/types/chat';
import {
  ExtractedMemoryCandidate,
  MemoryCategory,
  MemoryDraft,
  MemoryItem,
  MemoryPermissions,
} from '@/types/memory';
import { UserProfile, VoiceSettings } from '@/types/user';

const INITIAL_GREETING_MESSAGE: ChatMessage = {
  id: 'live-welcome-msg-1',
  conversationId: 'live-session-1',
  role: 'assistant',
  content:
    "Hey! I'm Aura, your personal AI friend. Tell me what's on your mind—or tap the mic to talk with me live!",
  createdAt: 'Just now',
  durationSeconds: 4,
  isExamplePreview: false,
};

export const EXAMPLE_PREVIEW_SESSIONS: ConversationSession[] = [
  {
    id: 'preview-morning-routine',
    title: 'Morning routine & focus plan',
    previewText: 'Example preview: Planning a calm morning...',
    updatedAt: 'Preview Example',
    messageCount: 4,
    isExamplePreview: true,
  },
  {
    id: 'preview-weekend-cooking',
    title: 'Quick weeknight pasta ideas',
    previewText: 'Example preview: Lemon herb pasta in 20 minutes...',
    updatedAt: 'Preview Example',
    messageCount: 3,
    isExamplePreview: true,
  },
];

export const EXAMPLE_PREVIEW_MESSAGES: Record<string, ChatMessage[]> = {
  'preview-morning-routine': [
    {
      id: 'ex-1',
      conversationId: 'preview-morning-routine',
      role: 'assistant',
      content: 'Good morning! Ready to map out your top two priorities before noon?',
      createdAt: '9:00 AM · Preview',
      durationSeconds: 4,
      isExamplePreview: true,
    },
    {
      id: 'ex-2',
      conversationId: 'preview-morning-routine',
      role: 'user',
      content:
        'Yes! First I need to finish the mobile UI review, then take a 20-minute walk before my 11:30 call.',
      createdAt: '9:01 AM · Preview',
      isExamplePreview: true,
    },
    {
      id: 'ex-3',
      conversationId: 'preview-morning-routine',
      role: 'assistant',
      content:
        'That sounds like a great balance. I can block 9:15 to 10:45 for deep work, followed by your walk at 10:50.',
      createdAt: '9:01 AM · Preview',
      durationSeconds: 6,
      isExamplePreview: true,
    },
    {
      id: 'ex-4',
      conversationId: 'preview-morning-routine',
      role: 'user',
      content: 'Perfect, let’s do that.',
      createdAt: '9:02 AM · Preview',
      isExamplePreview: true,
    },
  ],
  'preview-weekend-cooking': [
    {
      id: 'ex-201',
      conversationId: 'preview-weekend-cooking',
      role: 'user',
      content: 'What is a light dinner I can cook in 20 minutes with garlic, olive oil, and spinach?',
      createdAt: 'Yesterday · Preview',
      isExamplePreview: true,
    },
    {
      id: 'ex-202',
      conversationId: 'preview-weekend-cooking',
      role: 'assistant',
      content:
        'Try garlic-oil spaghetti with wilted baby spinach, toasted pine nuts, and lemon zest—it takes only 15 minutes!',
      createdAt: 'Yesterday · Preview',
      durationSeconds: 6,
      isExamplePreview: true,
    },
    {
      id: 'ex-203',
      conversationId: 'preview-weekend-cooking',
      role: 'user',
      content: 'Sounds delicious, thanks!',
      createdAt: 'Yesterday · Preview',
      isExamplePreview: true,
    },
  ],
};

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'Profile',
    title: 'Preferred Name',
    content: 'Likes friendly, natural conversations.',
    createdAt: 'Approved by user',
    updatedAt: 'Approved by user',
    explicitConsentGranted: true,
    consentedAt: 'Explicitly approved',
  },
  {
    id: 'mem-2',
    category: 'Work',
    title: 'Current Focus Project',
    content: 'Building an Android Personal AI Voice Assistant.',
    createdAt: 'Approved by user',
    updatedAt: 'Approved by user',
    explicitConsentGranted: true,
    consentedAt: 'Explicitly approved',
  },
];

interface AppState {
  chatMode: ChatMode;
  activeLiveConversationId: string;
  activePreviewConversationId: string;
  liveSessions: ConversationSession[];
  liveMessagesBySession: Record<string, ChatMessage[]>;

  memories: MemoryItem[];
  pendingMemoryCandidates: ExtractedMemoryCandidate[];
  lastMemoryNotice: string | null;
  memoryPermissions: MemoryPermissions;

  userProfile: UserProfile;
  voiceSettings: VoiceSettings;
  privacySettings: {
    localAudioCleanup: boolean;
    shareDiagnostics: boolean;
  };
}

let state: AppState = {
  chatMode: 'live',
  activeLiveConversationId: 'live-session-1',
  activePreviewConversationId: 'preview-morning-routine',
  liveSessions: [
    {
      id: 'live-session-1',
      title: 'Current Conversation',
      previewText: INITIAL_GREETING_MESSAGE.content,
      updatedAt: 'Just now',
      messageCount: 1,
      isExamplePreview: false,
    },
  ],
  liveMessagesBySession: {
    'live-session-1': [INITIAL_GREETING_MESSAGE],
  },
  memories: INITIAL_MEMORIES,
  pendingMemoryCandidates: [],
  lastMemoryNotice: null,
  memoryPermissions: {
    allowMemoryRequests: true,
    autoSaveSpokenMemories: true,
    requireExplicitConfirmationEveryTime: false,
    enabledCategories: {
      Profile: true,
      Preferences: true,
      Work: true,
      Interests: true,
    },
  },
  userProfile: {
    id: 'guest-user',
    name: 'Friend',
    email: 'you@aura.ai',
    avatarInitials: 'AU',
    authStatus: 'pending_firebase_integration',
  },
  voiceSettings: {
    selectedVoiceId: 'warm-calm',
    languageCode: 'en-US',
    speechSpeed: 1.0,
    voicePitch: 1.05,
    customStylePrompt:
      'Speak like a warm, caring best friend. Keep answers natural, concise, and helpful.',
    continuousMode: true,
    autoPlayAssistantVoice: true,
  },
  privacySettings: {
    localAudioCleanup: true,
    shareDiagnostics: false,
  },
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const AppStore = {
  getState(): AppState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getEffectiveVoiceStyleNote(): string {
    const persona =
      AppConfig.voicePersonas.find(
        (p) => p.id === state.voiceSettings.selectedVoiceId
      ) || AppConfig.voicePersonas[0];
    const custom = state.voiceSettings.customStylePrompt.trim();
    return custom ? `${persona.stylePrompt} ${custom}` : persona.stylePrompt;
  },

  getApprovedMemoriesContext(): Array<{
    category: string;
    title: string;
    content: string;
  }> {
    if (!state.memoryPermissions.allowMemoryRequests) return [];
    return state.memories
      .filter(
        (m) =>
          m.explicitConsentGranted &&
          state.memoryPermissions.enabledCategories[m.category]
      )
      .map((m) => ({
        category: m.category,
        title: m.title,
        content: m.content,
      }));
  },

  /**
   * Handles personal memories analyzed from the user's speech or chat message.
   * If `autoSaveSpokenMemories` is enabled (or if the user approves via 1-tap banner),
   * saves or queues them cleanly.
   */
  processExtractedMemories(
    rawCandidates?: Array<{
      category: MemoryCategory;
      title: string;
      content: string;
      explicit_save?: boolean;
    }>
  ) {
    if (!rawCandidates || rawCandidates.length === 0) return;
    if (!state.memoryPermissions.allowMemoryRequests) return;

    const validCandidates = rawCandidates.filter(
      (c) =>
        c.title &&
        c.content &&
        state.memoryPermissions.enabledCategories[c.category]
    );
    if (validCandidates.length === 0) return;

    if (
      state.memoryPermissions.autoSaveSpokenMemories &&
      !state.memoryPermissions.requireExplicitConfirmationEveryTime
    ) {
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const updatedMemories = [...state.memories];
      const savedTitles: string[] = [];

      for (const cand of validCandidates) {
        const existingIndex = updatedMemories.findIndex(
          (m) =>
            m.category === cand.category &&
            m.title.toLowerCase() === cand.title.toLowerCase()
        );
        const newItem: MemoryItem = {
          id:
            existingIndex >= 0
              ? updatedMemories[existingIndex].id
              : `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: cand.category,
          title: cand.title.trim(),
          content: cand.content.trim(),
          createdAt: `Today, ${nowLabel}`,
          updatedAt: `Today, ${nowLabel}`,
          explicitConsentGranted: true,
          consentedAt: `Learned from conversation at ${nowLabel}`,
        };

        if (existingIndex >= 0) {
          updatedMemories[existingIndex] = newItem;
        } else {
          updatedMemories.unshift(newItem);
        }
        savedTitles.push(`${cand.title}: ${cand.content}`);
      }

      state = {
        ...state,
        memories: updatedMemories,
        lastMemoryNotice: `Remembered: ${savedTitles.join(' · ')}`,
      };
      notify();
    } else {
      // Queue for explicit 1-tap approval banner
      const newPending: ExtractedMemoryCandidate[] = validCandidates.map((c, idx) => ({
        id: `cand-${Date.now()}-${idx}`,
        category: c.category,
        title: c.title,
        content: c.content,
        explicit_save: c.explicit_save,
      }));
      state = {
        ...state,
        pendingMemoryCandidates: [...newPending, ...state.pendingMemoryCandidates],
      };
      notify();
    }
  },

  approvePendingCandidate(candidateId: string) {
    const candidate = state.pendingMemoryCandidates.find(
      (c) => c.id === candidateId
    );
    if (!candidate) return;

    this.addApprovedMemory({
      category: candidate.category,
      title: candidate.title,
      content: candidate.content,
      explicitConsentGranted: true,
    });

    state = {
      ...state,
      pendingMemoryCandidates: state.pendingMemoryCandidates.filter(
        (c) => c.id !== candidateId
      ),
      lastMemoryNotice: `Approved & saved: ${candidate.title}`,
    };
    notify();
  },

  dismissPendingCandidate(candidateId: string) {
    state = {
      ...state,
      pendingMemoryCandidates: state.pendingMemoryCandidates.filter(
        (c) => c.id !== candidateId
      ),
    };
    notify();
  },

  clearMemoryNotice() {
    state = { ...state, lastMemoryNotice: null };
    notify();
  },

  setChatMode(mode: ChatMode) {
    state = { ...state, chatMode: mode };
    notify();
  },

  selectConversation(sessionId: string, isPreview: boolean) {
    if (isPreview) {
      state = {
        ...state,
        chatMode: 'preview',
        activePreviewConversationId: sessionId,
      };
    } else {
      state = {
        ...state,
        chatMode: 'live',
        activeLiveConversationId: sessionId,
      };
    }
    notify();
  },

  startNewLiveConversation(): string {
    const newId = `live-session-${Date.now()}`;
    const greeting: ChatMessage = {
      id: `greeting-${Date.now()}`,
      conversationId: newId,
      role: 'assistant',
      content: "Hey! Fresh chat started. What's on your mind?",
      createdAt: 'Just now',
      durationSeconds: 3,
      isExamplePreview: false,
    };

    const newSession: ConversationSession = {
      id: newId,
      title: `Conversation #${state.liveSessions.length + 1}`,
      previewText: greeting.content,
      updatedAt: 'Just now',
      messageCount: 1,
      isExamplePreview: false,
    };

    state = {
      ...state,
      chatMode: 'live',
      activeLiveConversationId: newId,
      liveSessions: [newSession, ...state.liveSessions],
      liveMessagesBySession: {
        ...state.liveMessagesBySession,
        [newId]: [greeting],
      },
    };
    notify();
    return newId;
  },

  appendLiveMessage(sessionId: string, message: ChatMessage) {
    const existing = state.liveMessagesBySession[sessionId] || [];
    const updatedMessages = [...existing, message];

    const updatedSessions = state.liveSessions.map((session) => {
      if (session.id !== sessionId) return session;
      const updatedTitle =
        session.title.startsWith('Current Conversation') ||
        session.title.startsWith('Conversation #')
          ? message.role === 'user'
            ? message.content.slice(0, 34) +
              (message.content.length > 34 ? '...' : '')
            : session.title
          : session.title;
      return {
        ...session,
        title: updatedTitle,
        previewText: message.content,
        updatedAt: message.createdAt,
        messageCount: updatedMessages.length,
      };
    });

    state = {
      ...state,
      liveSessions: updatedSessions,
      liveMessagesBySession: {
        ...state.liveMessagesBySession,
        [sessionId]: updatedMessages,
      },
    };
    notify();
  },

  clearAllLiveConversations() {
    const resetId = `live-session-${Date.now()}`;
    const freshGreeting: ChatMessage = {
      ...INITIAL_GREETING_MESSAGE,
      id: `greeting-${Date.now()}`,
      conversationId: resetId,
      createdAt: 'Just now',
    };

    state = {
      ...state,
      chatMode: 'live',
      activeLiveConversationId: resetId,
      liveSessions: [
        {
          id: resetId,
          title: 'Current Conversation',
          previewText: freshGreeting.content,
          updatedAt: 'Just now',
          messageCount: 1,
          isExamplePreview: false,
        },
      ],
      liveMessagesBySession: {
        [resetId]: [freshGreeting],
      },
    };
    notify();
  },

  addApprovedMemory(draft: MemoryDraft): MemoryItem {
    if (!draft.explicitConsentGranted) {
      throw new Error(
        'Personal information cannot be saved without explicit user consent.'
      );
    }
    if (!state.memoryPermissions.allowMemoryRequests) {
      throw new Error(
        'Memory saving is currently disabled in your Memory Permission settings.'
      );
    }
    if (!state.memoryPermissions.enabledCategories[draft.category]) {
      throw new Error(
        `Saving memories in the "${draft.category}" category is currently disabled in permissions.`
      );
    }

    const nowLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newItem: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: draft.category,
      title: draft.title.trim(),
      content: draft.content.trim(),
      createdAt: `Today, ${nowLabel}`,
      updatedAt: `Today, ${nowLabel}`,
      explicitConsentGranted: true,
      consentedAt: `Approved Today at ${nowLabel}`,
    };

    state = {
      ...state,
      memories: [newItem, ...state.memories],
    };
    notify();
    return newItem;
  },

  updateMemory(
    id: string,
    updates: {
      title: string;
      content: string;
      category: MemoryCategory;
      explicitConsentGranted: boolean;
    }
  ) {
    if (!updates.explicitConsentGranted) {
      throw new Error('Explicit user approval is required to save changes.');
    }

    const nowLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    state = {
      ...state,
      memories: state.memories.map((item) =>
        item.id === id
          ? {
              ...item,
              title: updates.title.trim(),
              content: updates.content.trim(),
              category: updates.category,
              updatedAt: `Edited Today, ${nowLabel}`,
              consentedAt: `Re-approved Today at ${nowLabel}`,
            }
          : item
      ),
    };
    notify();
  },

  deleteMemory(id: string) {
    state = {
      ...state,
      memories: state.memories.filter((item) => item.id !== id),
    };
    notify();
  },

  clearAllMemories() {
    state = {
      ...state,
      memories: [],
    };
    notify();
  },

  updateMemoryPermissions(partial: Partial<MemoryPermissions>) {
    state = {
      ...state,
      memoryPermissions: {
        ...state.memoryPermissions,
        ...partial,
      },
    };
    notify();
  },

  toggleCategoryPermission(category: MemoryCategory) {
    state = {
      ...state,
      memoryPermissions: {
        ...state.memoryPermissions,
        enabledCategories: {
          ...state.memoryPermissions.enabledCategories,
          [category]: !state.memoryPermissions.enabledCategories[category],
        },
      },
    };
    notify();
  },

  updateVoiceSettings(partial: Partial<VoiceSettings>) {
    state = {
      ...state,
      voiceSettings: {
        ...state.voiceSettings,
        ...partial,
      },
    };
    notify();
  },

  updateUserProfile(partial: Partial<UserProfile>) {
    state = {
      ...state,
      userProfile: {
        ...state.userProfile,
        ...partial,
      },
    };
    notify();
  },

  updatePrivacySettings(partial: Partial<AppState['privacySettings']>) {
    state = {
      ...state,
      privacySettings: {
        ...state.privacySettings,
        ...partial,
      },
    };
    notify();
  },
};

export function useAppStore(): AppState {
  const [snapshot, setSnapshot] = useState<AppState>(() => AppStore.getState());

  useEffect(() => {
    return AppStore.subscribe(() => {
      setSnapshot(AppStore.getState());
    });
  }, []);

  return snapshot;
}
