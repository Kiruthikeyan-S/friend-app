import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GlassBackground, IridescentMiniOrb } from '@/components/GlassBackground';
import { VoiceButton } from '@/components/VoiceButton';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppConfig } from '@/constants/config';
import { useVoice } from '@/hooks/useVoice';
import { AppStore } from '@/services/appStore';
import { VoiceService } from '@/services/voice';

export default function VoiceAssistantScreen() {
  const router = useRouter();
  const {
    interactionState,
    recordingSeconds,
    recognizedSpeechPreview,
    assistantResponsePreview,
    statusMessage,
    autoSendSeconds,
    setAutoSendSeconds,
    voiceSettings,
    lastMemoryNotice,
    startListening,
    handlePrimaryMicPress,
    cancelRecording,
    stopSpeaking,
  } = useVoice();

  const startListeningFocusRef = useRef(startListening);
  const cancelRecordingBlurRef = useRef(cancelRecording);
  startListeningFocusRef.current = startListening;
  cancelRecordingBlurRef.current = cancelRecording;

  useFocusEffect(
    useCallback(() => {
      if (!AppStore.getState().voiceSettings.continuousMode) {
        AppStore.updateVoiceSettings({ continuousMode: true });
      }
      const timer = setTimeout(() => {
        startListeningFocusRef.current();
      }, 180);

      return () => {
        clearTimeout(timer);
        cancelRecordingBlurRef.current();
      };
    }, [])
  );

  const [trainModalVisible, setTrainModalVisible] = useState(false);
  const [customPromptDraft, setCustomPromptDraft] = useState(
    voiceSettings.customStylePrompt
  );

  const activePersona =
    AppConfig.voicePersonas.find(
      (v) => v.id === voiceSettings.selectedVoiceId
    ) || AppConfig.voicePersonas[0];

  const handleSelectPersona = (
    persona: (typeof AppConfig.voicePersonas)[number],
    playPreview = true
  ) => {
    AppStore.updateVoiceSettings({
      selectedVoiceId: persona.id,
      voicePitch: persona.pitch,
      speechSpeed: persona.defaultRate,
    });
    if (playPreview) {
      VoiceService.speakText(persona.sampleText, {
        personaId: persona.id,
        language: persona.voiceLocale,
        pitch: persona.pitch,
        rate: persona.defaultRate,
      });
    }
  };

  const handleTestVoiceSample = () => {
    VoiceService.speakText(activePersona.sampleText, {
      personaId: activePersona.id,
      language: voiceSettings.languageCode,
      pitch: voiceSettings.voicePitch,
      rate: voiceSettings.speechSpeed,
    });
  };

  const handleSaveVoiceTraining = () => {
    AppStore.updateVoiceSettings({
      customStylePrompt: customPromptDraft.trim(),
    });
    setTrainModalVisible(false);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Glassmorphic Header (Matching Center Phone Mockup) */}
        <View style={styles.topHeader}>
          <Pressable
            onPress={() => router.push('/(tabs)/chat')}
            style={({ pressed }) => [
              styles.circleGlassBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to Smart Chat"
          >
            <Feather
              name="chevron-left"
              size={20}
              color={Colors.textPrimary}
            />
          </Pressable>

          <Pressable
            onPress={handleTestVoiceSample}
            style={({ pressed }) => [
              styles.voicePulsePill,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Preview active voice persona"
          >
            <IridescentMiniOrb size={24} />
            <Text style={styles.voicePulseText}>
              Voice Pulse · {activePersona.shortName}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setCustomPromptDraft(voiceSettings.customStylePrompt);
              setTrainModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.circleGlassBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Train voice and choose from 5 voices"
          >
            <Feather
              name="more-vertical"
              size={18}
              color={Colors.textPrimary}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title: AI Voice Recognition */}
          <Text style={styles.screenMainTitle}>AI Voice Recognition</Text>
          <Text style={styles.screenSubStatus}>{statusMessage}</Text>

          {/* 5 Agent Voices Quick Glass Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.voicesStrip}
          >
            {AppConfig.voicePersonas.map((persona) => {
              const selected = voiceSettings.selectedVoiceId === persona.id;
              return (
                <Pressable
                  key={persona.id}
                  onPress={() => handleSelectPersona(persona, true)}
                  style={[
                    styles.voiceGlassPill,
                    selected && styles.voiceGlassPillSelected,
                  ]}
                >
                  <Feather
                    name={selected ? 'volume-2' : 'mic'}
                    size={12}
                    color={selected ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.voiceGlassPillName,
                      selected && styles.voiceGlassPillNameSelected,
                    ]}
                  >
                    {persona.shortName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Live Memory Learned Glass Toast */}
          {lastMemoryNotice ? (
            <View style={styles.memoryLearnedPill}>
              <Feather name="bookmark" size={14} color={Colors.primary} />
              <Text style={styles.memoryLearnedText} numberOfLines={2}>
                {lastMemoryNotice}
              </Text>
              <Pressable
                onPress={() => AppStore.clearMemoryNotice()}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={Colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}

          {/* Centerpiece 3D Iridescent Glass Bubble Orb */}
          <VoiceButton
            state={interactionState}
            recordingSeconds={recordingSeconds}
            onPress={handlePrimaryMicPress}
          />

          {/* Two Frosted Glass Square Cards Below the Orb (Matching Mockup) */}
          <View style={styles.dualGlassCardsRow}>
            {/* Left Square Glass Card: Voice Clarity Boost / You Spoke */}
            <Pressable
              onPress={handlePrimaryMicPress}
              style={({ pressed }) => [
                styles.glassFeatureSquare,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.squareTopIcons}>
                <View style={styles.squareIconCircle}>
                  <Feather
                    name="activity"
                    size={16}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.squareIconCircle}>
                  <Feather
                    name="arrow-up-right"
                    size={15}
                    color={Colors.textPrimary}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.squareCardTitle}>
                  {recognizedSpeechPreview
                    ? 'You Spoke'
                    : 'Voice Clarity\nBoost'}
                </Text>
                <Text style={styles.squareCardSub} numberOfLines={3}>
                  {recognizedSpeechPreview ||
                    'Auto-Listening & Instant Voice Reply Active'}
                </Text>
              </View>
            </Pressable>

            {/* Right Square Glass Card: Instant Speech Capture / Aura's Reply */}
            <Pressable
              onPress={() => {
                setCustomPromptDraft(voiceSettings.customStylePrompt);
                setTrainModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.glassFeatureSquare,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.squareTopIcons}>
                <View style={styles.squareIconCircle}>
                  <Feather
                    name="aperture"
                    size={16}
                    color={Colors.accent}
                  />
                </View>
                <View style={styles.squareIconCircle}>
                  <Feather
                    name="arrow-up-right"
                    size={15}
                    color={Colors.textPrimary}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.squareCardTitle}>
                  {assistantResponsePreview
                    ? "Aura's Reply"
                    : 'Instant Speech\nCapture'}
                </Text>
                <Text style={styles.squareCardSub} numberOfLines={3}>
                  {assistantResponsePreview ||
                    `${activePersona.name} · 0.7s instant silence reply`}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Bottom 3-Button Floating Glass Control Dock (Matching Mockup: [ AI ] [ 🎙️ ] [ ✕ ]) */}
          <View style={styles.bottomGlassDock}>
            <Pressable
              onPress={() => router.push('/(tabs)/chat')}
              style={({ pressed }) => [
                styles.dockSideGlassCircle,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Switch to Smart Chat"
            >
              <Feather
                name="message-circle"
                size={19}
                color={Colors.textPrimary}
              />
            </Pressable>

            <Pressable
              onPress={handlePrimaryMicPress}
              style={({ pressed }) => [
                styles.dockCenterMicOrb,
                interactionState === 'listening' &&
                  styles.dockCenterMicOrbActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start or finish speaking immediately"
            >
              <Feather
                name={
                  interactionState === 'listening'
                    ? 'check'
                    : interactionState === 'speaking'
                    ? 'volume-2'
                    : 'mic'
                }
                size={24}
                color={
                  interactionState === 'listening'
                    ? Colors.textInverse
                    : Colors.textPrimary
                }
              />
            </Pressable>

            <Pressable
              onPress={
                interactionState === 'speaking' ? stopSpeaking : cancelRecording
              }
              style={({ pressed }) => [
                styles.dockSideGlassCircle,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel recording or stop speaking"
            >
              <Feather name="x" size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </ScrollView>

        {/* Train Voice & 5-Persona Selector Modal */}
        <Modal
          visible={trainModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setTrainModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Train Voice & 5 Agent Personas
                </Text>
                <Pressable
                  onPress={() => setTrainModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Feather name="x" size={20} color={Colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.continuousModalRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.personaName}>
                      Continuous Hands-Free Loop
                    </Text>
                    <Text style={styles.personaDesc}>
                      Replies immediately when you pause speaking (0.7s silence)
                    </Text>
                  </View>
                  <Switch
                    value={voiceSettings.continuousMode}
                    onValueChange={(val) =>
                      AppStore.updateVoiceSettings({ continuousMode: val })
                    }
                    trackColor={{ false: Colors.borderSubtle, true: Colors.primary }}
                  />
                </View>

                <Text style={styles.fieldLabel}>
                  1. Choose Agent Voice (5 Voices · Tap to Hear Sample)
                </Text>
                <View style={styles.optionsCol}>
                  {AppConfig.voicePersonas.map((p) => {
                    const selected = voiceSettings.selectedVoiceId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => handleSelectPersona(p, true)}
                        style={[
                          styles.personaRow,
                          selected && styles.personaRowSelected,
                        ]}
                      >
                        <View style={styles.personaInfoCol}>
                          <Text
                            style={[
                              styles.personaName,
                              selected && styles.personaNameSelected,
                            ]}
                          >
                            {p.name}
                          </Text>
                          <Text style={styles.personaDesc}>
                            {p.badge} · {p.description}
                          </Text>
                        </View>
                        <Feather
                          name={selected ? 'volume-2' : 'play-circle'}
                          size={18}
                          color={selected ? Colors.primary : Colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>2. Voice Pitch (Tone)</Text>
                <View style={styles.chipsWrap}>
                  {AppConfig.voicePitchPresets.map((preset) => {
                    const selected =
                      Math.abs(voiceSettings.voicePitch - preset.value) < 0.03;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() =>
                          AppStore.updateVoiceSettings({
                            voicePitch: preset.value,
                          })
                        }
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>3. Speech Speed</Text>
                <View style={styles.chipsWrap}>
                  {AppConfig.speechSpeeds.map((s) => {
                    const selected =
                      Math.abs(voiceSettings.speechSpeed - s.value) < 0.03;
                    return (
                      <Pressable
                        key={s.label}
                        onPress={() =>
                          AppStore.updateVoiceSettings({ speechSpeed: s.value })
                        }
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>
                  4. Max Phrase Window (Auto-Sends Immediately on Silence)
                </Text>
                <View style={styles.chipsWrap}>
                  {[2, 3, 4, 6].map((sec) => {
                    const selected = autoSendSeconds === sec;
                    return (
                      <Pressable
                        key={sec}
                        onPress={() => setAutoSendSeconds(sec)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {sec} sec
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>
                  5. Train How Aura Talks to You (Custom Instructions)
                </Text>
                <TextInput
                  style={styles.promptInput}
                  value={customPromptDraft}
                  onChangeText={setCustomPromptDraft}
                  placeholder="e.g., Talk like my close friend, keep replies short and fun..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />

                <Pressable
                  onPress={handleTestVoiceSample}
                  style={styles.testVoiceBtn}
                >
                  <Feather name="volume-2" size={16} color={Colors.primary} />
                  <Text style={styles.testVoiceBtnText}>
                    Test Trained Voice Out Loud
                  </Text>
                </Pressable>
              </ScrollView>

              <Pressable
                onPress={handleSaveVoiceTraining}
                style={styles.saveModalBtn}
              >
                <Text style={styles.saveModalBtnText}>Save Voice Training</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  circleGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  voicePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  voicePulseText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  screenMainTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  screenSubStatus: {
    fontSize: 12.5,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  voicesStrip: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  voiceGlassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  voiceGlassPillSelected: {
    backgroundColor: 'rgba(236, 106, 181, 0.18)',
    borderColor: Colors.primary,
  },
  voiceGlassPillName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  voiceGlassPillNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  memoryLearnedPill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  memoryLearnedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  dualGlassCardsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  glassFeatureSquare: {
    flex: 1,
    minHeight: 148,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    padding: 15,
    justifyContent: 'space-between',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  squareTopIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  squareIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareCardTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  squareCardSub: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bottomGlassDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 2,
  },
  dockSideGlassCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  dockCenterMicOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(244, 218, 248, 0.92)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D95BA3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 5,
  },
  dockCenterMicOrbActive: {
    backgroundColor: Colors.primary,
    borderColor: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    padding: Spacing.xl,
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  continuousModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 12,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 8,
  },
  optionsCol: {
    gap: 8,
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  personaRowSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  personaInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  personaName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  personaNameSelected: {
    color: Colors.primary,
  },
  personaDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.textInverse,
  },
  promptInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 12,
    minHeight: 74,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  testVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primarySoft,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  testVoiceBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  saveModalBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.82,
  },
});
