/**
 * useVoice Hook
 * Real Microphone Recording (`expo-audio` with real-time Metering & Instant Silence Detection)
 * + Whisper Turbo STT + Ollama Cloud (`deepseek-v4.1-flash`) / Groq Ultra-Fast LLM
 * + Automatic Personal Memory Analysis + Real Spoken Output (`expo-speech`)
 * + Immediate Hands-Free Continuous Conversation Loop!
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { ApiService } from '@/services/api';
import { AppStore, useAppStore } from '@/services/appStore';
import { MicPermissionStatus, VoiceService } from '@/services/voice';
import { ChatMessage } from '@/types/chat';

export type VoiceInteractionState = 'idle' | 'listening' | 'processing' | 'speaking';

const METERING_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export function useVoice() {
  const store = useAppStore();
  const audioRecorder = useAudioRecorder(METERING_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 120);

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
    'Listening... Speak naturally—Aura answers out loud immediately!'
  );
  const [autoSendSeconds, setAutoSendSeconds] = useState<number>(4);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isContinuousActiveRef = useRef<boolean>(false);
  const isFinishingRef = useRef<boolean>(false);
  const hasDetectedSpeechRef = useRef<boolean>(false);
  const lastSpeechTimestampRef = useRef<number>(0);
  const recordingStartTimestampRef = useRef<number>(0);

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

  // Real-time Voice Activity / Silence Detection (VAD) for Immediate Response
  useEffect(() => {
    if (interactionState !== 'listening' || isFinishingRef.current) {
      return;
    }

    const level = recorderState.metering;
    if (typeof level !== 'number') {
      return;
    }

    const now = Date.now();
    const elapsedMs = now - recordingStartTimestampRef.current;

    // Android MediaRecorder metering: 20*log10(amp/32767).
    // Room noise is typically -30 dB to -22 dB; active human speech is > -18 dB.
    if (level > -18) {
      hasDetectedSpeechRef.current = true;
      lastSpeechTimestampRef.current = now;
    } else if (
      hasDetectedSpeechRef.current &&
      level < -24 &&
      elapsedMs >= 1300 &&
      now - lastSpeechTimestampRef.current >= 850
    ) {
      // User spoke and paused for 0.85s -> Respond immediately!
      isFinishingRef.current = true;
      finishListeningRef.current();
    }
  }, [
    interactionState,
    recorderState.metering,
    store.voiceSettings.continuousMode,
  ]);

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

      const now = Date.now();
      isContinuousActiveRef.current = true;
      isFinishingRef.current = false;
      hasDetectedSpeechRef.current = false;
      lastSpeechTimestampRef.current = now;
      recordingStartTimestampRef.current = now;

      setRecordingSeconds(0);
      setInteractionState('listening');
      setStatusMessage(
        store.voiceSettings.continuousMode
          ? 'Listening... Speak naturally—replies immediately when you pause!'
          : 'Listening... Tap the orb as soon as you finish speaking'
      );

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Automatic voice turn window: sends speech automatically even if metering stays flat
      autoSendTimeoutRef.current = setTimeout(() => {
        if (!isFinishingRef.current) {
          isFinishingRef.current = true;
          finishListeningRef.current();
        }
      }, autoSendSeconds * 1000);
    } catch (err) {
      isContinuousActiveRef.current = false;
      isFinishingRef.current = false;
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
    isFinishingRef.current = true;
    setInteractionState('processing');
    setStatusMessage('Replying immediately...');

    try {
      const stopResult = await audioRecorder.stop();
      // Wait 80ms so Android MediaRecorder flushes the MPEG-4 moov atom to disk
      await new Promise((resolve) => setTimeout(resolve, 80));
      const recordedUri =
        (stopResult as { url?: string } | undefined)?.url || audioRecorder.uri;

      if (!recordedUri) {
        isFinishingRef.current = false;
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

      if (res.status === 'error') {
        isFinishingRef.current = false;
        setInteractionState('idle');
        setStatusMessage(res.message || 'Voice processing error.');
        return;
      }

      if (res.status === 'empty' || !res.transcript) {
        isFinishingRef.current = false;
        if (isContinuousActiveRef.current) {
          setStatusMessage(
            'Listening... Speak naturally—Aura answers out loud immediately!'
          );
          setTimeout(() => {
            if (isContinuousActiveRef.current) {
              startListeningRef.current();
            }
          }, 200);
        } else {
          setInteractionState('idle');
          setStatusMessage('Tap the orb to speak.');
        }
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

      // 4. Speak Aura's reply aloud immediately and loop back to listening if Continuous Mode is ON!
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      setInteractionState('speaking');
      setStatusMessage(
        AppStore.getState().voiceSettings.continuousMode
          ? 'Aura is speaking... (Tap orb anytime to interrupt & talk)'
          : 'Aura is speaking...'
      );

      const latestVoice = AppStore.getState().voiceSettings;
      VoiceService.speakText(res.reply, {
        personaId: latestVoice.selectedVoiceId,
        language: latestVoice.languageCode,
        pitch: latestVoice.voicePitch,
        rate: latestVoice.speechSpeed,
        onDone: () => {
          isFinishingRef.current = false;
          if (isContinuousActiveRef.current) {
            setTimeout(() => {
              if (isContinuousActiveRef.current) {
                startListeningRef.current();
              }
            }, 200);
          } else {
            setInteractionState('idle');
            setStatusMessage('Tap the orb to talk again');
          }
        },
        onStopped: () => {
          isFinishingRef.current = false;
          setInteractionState('idle');
          setStatusMessage('Paused. Tap the orb when ready.');
        },
        onError: () => {
          isFinishingRef.current = false;
          setInteractionState('idle');
          setStatusMessage('Tap the orb to talk again');
        },
      });
    } catch (err) {
      isContinuousActiveRef.current = false;
      isFinishingRef.current = false;
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
    isFinishingRef.current = false;
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
    isFinishingRef.current = false;
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
    startListening,
    handlePrimaryMicPress,
    cancelRecording,
    stopSpeaking,
  };
}
