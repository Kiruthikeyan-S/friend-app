/**
 * useChat Hook
 * Fast Groq AI chat with real Text-to-Speech (`expo-speech`) playback and
 * automatic personal memory extraction.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/services/api';
import {
  AppStore,
  EXAMPLE_PREVIEW_MESSAGES,
  EXAMPLE_PREVIEW_SESSIONS,
  useAppStore,
} from '@/services/appStore';
import { VoiceService } from '@/services/voice';
import { ChatMessage, ChatMode } from '@/types/chat';

export function useChat() {
  const store = useAppStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    ApiService.checkHealth().then((res) => {
      if (mounted) {
        setBackendOnline(res.online);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentMessages: ChatMessage[] =
    store.chatMode === 'preview'
      ? EXAMPLE_PREVIEW_MESSAGES[store.activePreviewConversationId] || []
      : store.liveMessagesBySession[store.activeLiveConversationId] || [];

  const activeSession =
    store.chatMode === 'preview'
      ? EXAMPLE_PREVIEW_SESSIONS.find(
          (s) => s.id === store.activePreviewConversationId
        ) || EXAMPLE_PREVIEW_SESSIONS[0]
      : store.liveSessions.find((s) => s.id === store.activeLiveConversationId) ||
        store.liveSessions[0];

  const speakMessageAloud = useCallback(
    (messageId: string, text: string) => {
      const { voiceSettings } = AppStore.getState();
      setPlayingMessageId(messageId);
      VoiceService.speakText(text, {
        language: voiceSettings.languageCode,
        pitch: voiceSettings.voicePitch,
        rate: voiceSettings.speechSpeed,
        onDone: () =>
          setPlayingMessageId((prev) => (prev === messageId ? null : prev)),
        onStopped: () =>
          setPlayingMessageId((prev) => (prev === messageId ? null : prev)),
        onError: () =>
          setPlayingMessageId((prev) => (prev === messageId ? null : prev)),
      });
    },
    []
  );

  const toggleVoicePlayback = useCallback(
    (messageId: string, text?: string) => {
      if (playingMessageId === messageId) {
        VoiceService.stopSpeaking();
        setPlayingMessageId(null);
        return;
      }
      const messageObj = currentMessages.find((m) => m.id === messageId);
      const contentToSpeak = text || messageObj?.content || '';
      if (!contentToSpeak) return;

      speakMessageAloud(messageId, contentToSpeak);
    },
    [currentMessages, playingMessageId, speakMessageAloud]
  );

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const trimmed = (overrideText ?? inputText).trim();
      if (!trimmed || isTyping) return;

      const targetSessionId = store.activeLiveConversationId;
      if (store.chatMode === 'preview') {
        AppStore.setChatMode('live');
      }

      if (overrideText === undefined) {
        setInputText('');
      }

      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const userMessage: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        conversationId: targetSessionId,
        role: 'user',
        content: trimmed,
        createdAt: timeLabel,
        isExamplePreview: false,
      };

      AppStore.appendLiveMessage(targetSessionId, userMessage);
      setIsTyping(true);

      try {
        const currentState = AppStore.getState();
        const existingHistory = (
          currentState.liveMessagesBySession[targetSessionId] || []
        ).map((m) => ({ role: m.role, content: m.content }));

        const activeMemories = AppStore.getApprovedMemoriesContext();
        const voiceStyleNote = AppStore.getEffectiveVoiceStyleNote();

        let replyContent = '';

        try {
          const backendRes = await ApiService.sendChatMessage(
            trimmed,
            targetSessionId,
            existingHistory,
            activeMemories,
            voiceStyleNote
          );
          setBackendOnline(true);

          if (backendRes.status === 'ok' && backendRes.reply) {
            replyContent = backendRes.reply;
            if (backendRes.memories && backendRes.memories.length > 0) {
              AppStore.processExtractedMemories(backendRes.memories);
            }
          } else {
            replyContent =
              backendRes.message ||
              "I'm here! Let me know what you'd like to talk about.";
          }
        } catch {
          setBackendOnline(false);
          replyContent =
            'Could not reach the backend server. Make sure your phone and PC are on the same Wi-Fi network.';
        }

        const assistantMsgId = `msg-assistant-${Date.now()}`;
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          conversationId: targetSessionId,
          role: 'assistant',
          content: replyContent,
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationSeconds: Math.max(
            2,
            Math.min(15, Math.ceil(replyContent.split(' ').length / 3))
          ),
          isExamplePreview: false,
        };

        AppStore.appendLiveMessage(targetSessionId, assistantMessage);

        if (AppStore.getState().voiceSettings.autoPlayAssistantVoice) {
          speakMessageAloud(assistantMsgId, replyContent);
        }
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, isTyping, speakMessageAloud, store.activeLiveConversationId, store.chatMode]
  );

  const startNewConversation = useCallback(() => {
    VoiceService.stopSpeaking();
    setPlayingMessageId(null);
    AppStore.startNewLiveConversation();
  }, []);

  const switchMode = useCallback((mode: ChatMode) => {
    AppStore.setChatMode(mode);
  }, []);

  const selectConversation = useCallback(
    (sessionId: string, isPreview: boolean) => {
      AppStore.selectConversation(sessionId, isPreview);
    },
    []
  );

  return {
    chatMode: store.chatMode,
    activeSession,
    messages: currentMessages,
    liveSessions: store.liveSessions,
    previewSessions: EXAMPLE_PREVIEW_SESSIONS,
    pendingMemoryCandidates: store.pendingMemoryCandidates,
    lastMemoryNotice: store.lastMemoryNotice,
    inputText,
    setInputText,
    isTyping,
    playingMessageId,
    backendOnline,
    voiceSettings: store.voiceSettings,
    sendMessage,
    toggleVoicePlayback,
    startNewConversation,
    switchMode,
    selectConversation,
  };
}
