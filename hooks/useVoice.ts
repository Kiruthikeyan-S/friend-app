/**
 * useVoice Hook
 * Real Microphone Recording (`expo-audio`) + Groq Whisper STT + Fast Groq LLM
 * + Automatic Personal Memory Analysis + Real Spoken Output (`expo-speech`)
 * + Continuous Hands-Free Conversation Loop!
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { ApiService } from '@/services/api';
import { AppStore, useAppStore } from '@/services/appStore';
import { MicPermissionStatus, VoiceService } from '@/services/voice';
import { ChatMessage } from '@/types/chat';

export type VoiceInteractionState = 'idle' | 'listening' | 'processing' | 'speaking';

export function useVoice() {
  const store = useAppStore();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [interactionState, setInteractionState] =
    useState<VoiceInteractionState>('idle');
  const [permissionStatus, setPermissionStatus] =
    useState<MicPermissionStatus>('undetermined');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recognizedSpeechPreview, setRecognizedSpeechPreview] =
    useState<string>('');
  const [assistantResponsePreview, setAssistantResponsePreview] =
    useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Tap the orb to start talking with Aura'
  );
  const [autoSendSeconds, setAutoSendSeconds] = useState<number>(5);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isContinuousActiveRef = useRef<boolean>(false);
  const startListeningRef = useRef<() => Promise<void>>(async () => {});
  const finishListeningRef = useRef<() => Promise<void>>(async () => {});

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    VoiceService.getMicrophonePermission().then(setPermissionStatus);
    return () => {
      clearTimers();
      isContinuousActiveRef.current = false;
      VoiceService.stopSpeaking();
    };
  }, [clearTimers]);

  const requestPermission = useCallback(async (): Promise<MicPermissionStatus> => {
    const status = await VoiceService.requestMicrophonePermission();
    setPermissionStatus(status);
    return status;
  }, []);

  const startListening = useCallback(async () => {
    clearTimers();
    VoiceService.stopSpeaking();

    let currentPerm = permissionStatus;
    if (currentPerm !== 'granted') {
      currentPerm = await requestPermission();
    }

    if (currentPerm === 'denied') {
      isContinuousActiveRef.current = false;
      setInteractionState('idle');
      setStatusMessage(
        'Microphone access is needed. Please allow microphone permission.'
      );
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      isContinuousActiveRef.current = true;
      setRecordingSeconds(0);
      setInteractionState('listening');
      setStatusMessage(
        store.voiceSettings.continuousMode
          ? `Listening... (Auto-sends after ${autoSendSeconds}s or tap orb now)`
          : 'Listening... Tap the orb when you finish speaking'
      );

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // In Continuous Mode, automatically send the turn after `autoSendSeconds`
      // so the user can converse hands-free without tapping!
      if (AppStore.getState().voiceSettings.continuousMode) {
        autoSendTimeoutRef.current = setTimeout(() => {
          finishListeningRef.current();
        }, autoSendSeconds * 1000);
      }
    } catch (err) {
      isContinuousActiveRef.current = false;
      setInteractionState('idle');
      setStatusMessage(
        err instanceof Error
          ? `Could not start recording: ${err.message}`
          : 'Could not start microphone recording.'
      );
    }
  }, [
    audioRecorder,
    autoSendSeconds,
    clearTimers,
    permissionStatus,
    requestPermission,
    store.voiceSettings.continuousMode,
  ]);

  const finishListeningAndProcess = useCallback(async () => {
    clearTimers();
    setInteractionState('processing');
    setStatusMessage('Analyzing your speech & thinking...');

    try {
      await audioRecorder.stop();
      const recordedUri = audioRecorder.uri;

      if (!recordedUri) {
        setInteractionState('idle');
        setStatusMessage('No audio recorded. Tap the orb to speak again.');
        return;
      }

      const audioBase64 = await VoiceService.readAudioUriAsBase64(recordedUri);
      const currentState = AppStore.getState();
      const sessionId = currentState.activeLiveConversationId;
      const existingHistory = (
        currentState.liveMessagesBySession[sessionId] || []
      ).map((m) => ({ role: m.role, content: m.content }));
      const approvedMemories = AppStore.getApprovedMemoriesContext();
      const voiceStyleNote = AppStore.getEffectiveVoiceStyleNote();

      const res = await ApiService.sendVoiceTurn({
        audioBase64,
        filename: 'speech.m4a',
        mimeType: 'audio/m4a',
        language: currentState.voiceSettings.languageCode,
        history: existingHistory,
        approvedMemories,
        voiceStyleNote,
      });

      if (res.status === 'empty' || !res.transcript) {
        if (
          isContinuousActiveRef.current &&
          AppStore.getState().voiceSettings.continuousMode
        ) {
          setStatusMessage("Didn't catch any speech—listening again...");
          setTimeout(() => {
            if (isContinuousActiveRef.current) {
              startListeningRef.current();
            }
          }, 500);
        } else {
          setInteractionState('idle');
          setStatusMessage("I didn't catch that. Tap the orb to speak again.");
        }
        return;
      }

      if (res.status === 'error') {
        setInteractionState('idle');
        setStatusMessage(res.message || 'Voice processing error.');
        return;
      }

      // 1. Update live transcript & reply preview on Voice screen
      setRecognizedSpeechPreview(res.transcript);
      setAssistantResponsePreview(res.reply);

      // 2. Sync spoken turn into Live Chat history
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const userMsg: ChatMessage = {
        id: `voice-user-${Date.now()}`,
        conversationId: sessionId,
        role: 'user',
        content: res.transcript,
        createdAt: `${nowLabel} · Voice`,
        isExamplePreview: false,
      };
      const assistantMsg: ChatMessage = {
        id: `voice-assistant-${Date.now()}`,
        conversationId: sessionId,
        role: 'assistant',
        content: res.reply,
        createdAt: `${nowLabel} · Voice`,
        durationSeconds: Math.max(
          2,
          Math.min(15, Math.ceil(res.reply.split(' ').length / 3))
        ),
        isExamplePreview: false,
      };
      AppStore.appendLiveMessage(sessionId, userMsg);
      AppStore.appendLiveMessage(sessionId, assistantMsg);

      // 3. Process any personal memories Aura analyzed from what you spoke!
      if (res.memories && res.memories.length > 0) {
        AppStore.processExtractedMemories(res.memories);
      }

      // 4. Speak Aura's reply aloud and loop back to listening if Continuous Mode is ON!
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      setInteractionState('speaking');
      setStatusMessage(
        AppStore.getState().voiceSettings.continuousMode
          ? 'Aura is speaking... (Will listen again automatically)'
          : 'Aura is speaking...'
      );

      const latestVoice = AppStore.getState().voiceSettings;
      VoiceService.speakText(res.reply, {
        language: latestVoice.languageCode,
        pitch: latestVoice.voicePitch,
        rate: latestVoice.speechSpeed,
        onDone: () => {
          if (
            isContinuousActiveRef.current &&
            AppStore.getState().voiceSettings.continuousMode
          ) {
            setTimeout(() => {
              if (isContinuousActiveRef.current) {
                startListeningRef.current();
              }
            }, 350);
          } else {
            setInteractionState('idle');
            setStatusMessage('Tap the orb to talk again');
          }
        },
        onStopped: () => {
          setInteractionState('idle');
          setStatusMessage('Paused. Tap the orb when ready.');
        },
        onError: () => {
          setInteractionState('idle');
          setStatusMessage('Tap the orb to talk again');
        },
      });
    } catch (err) {
      isContinuousActiveRef.current = false;
      setInteractionState('idle');
      setStatusMessage(
        err instanceof Error
          ? `Connection error: ${err.message}`
          : 'Could not reach the backend server.'
      );
    }
  }, [audioRecorder, clearTimers]);

  useEffect(() => {
    startListeningRef.current = startListening;
    finishListeningRef.current = finishListeningAndProcess;
  }, [finishListeningAndProcess, startListening]);

  const cancelRecording = useCallback(async () => {
    isContinuousActiveRef.current = false;
    clearTimers();
    try {
      await audioRecorder.stop();
    } catch {
      // Ignore if not actively recording
    }
    VoiceService.stopSpeaking();
    setRecordingSeconds(0);
    setInteractionState('idle');
    setStatusMessage('Conversation paused. Tap the orb to start again.');
  }, [audioRecorder, clearTimers]);

  const stopSpeaking = useCallback(() => {
    isContinuousActiveRef.current = false;
    clearTimers();
    VoiceService.stopSpeaking();
    setInteractionState('idle');
    setStatusMessage('Stopped speaking. Tap the orb to talk again.');
  }, [clearTimers]);

  const handlePrimaryMicPress = useCallback(() => {
    if (interactionState === 'idle') {
      startListening();
    } else if (interactionState === 'listening') {
      finishListeningAndProcess();
    } else if (interactionState === 'speaking') {
      // Tapping the orb while Aura is speaking interrupts her and immediately listens to you!
      VoiceService.stopSpeaking();
      startListening();
    }
  }, [finishListeningAndProcess, interactionState, startListening]);

  return {
    interactionState,
    permissionStatus,
    recordingSeconds,
    recognizedSpeechPreview,
    assistantResponsePreview,
    statusMessage,
    autoSendSeconds,
    setAutoSendSeconds,
    voiceSettings: store.voiceSettings,
    memories: store.memories,
    pendingMemoryCandidates: store.pendingMemoryCandidates,
    lastMemoryNotice: store.lastMemoryNotice,
    requestPermission,
    handlePrimaryMicPress,
    cancelRecording,
    stopSpeaking,
  };
}
