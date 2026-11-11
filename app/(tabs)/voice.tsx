import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { VoiceButton } from '@/components/VoiceButton';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppConfig } from '@/constants/config';
import { useVoice, VoiceInteractionState } from '@/hooks/useVoice';
import { AppStore } from '@/services/appStore';
import { VoiceService } from '@/services/voice';

const STATE_PILLS: Array<{ key: VoiceInteractionState; label: string }> = [
  { key: 'idle', label: 'Ready' },
  { key: 'listening', label: 'Listening' },
  { key: 'processing', label: 'Thinking' },
  { key: 'speaking', label: 'Speaking' },
];

export default function VoiceAssistantScreen() {
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
    handlePrimaryMicPress,
    cancelRecording,
    stopSpeaking,
  } = useVoice();

  const [trainModalVisible, setTrainModalVisible] = useState(false);
  const [customPromptDraft, setCustomPromptDraft] = useState(
    voiceSettings.customStylePrompt
  );

  const activePersona =
    AppConfig.voicePersonas.find(
      (v) => v.id === voiceSettings.selectedVoiceId
    ) || AppConfig.voicePersonas[0];

  const handleTestVoiceSample = () => {
    VoiceService.speakText(
      `Hi! I'm ${activePersona.name.split(' ')[0]}. I'm tuned to your preferred voice pitch and speed, and ready to chat continuously with you!`,
      {
        language: voiceSettings.languageCode,
        pitch: voiceSettings.voicePitch,
        rate: voiceSettings.speechSpeed,
      }
    );
  };

  const handleSaveVoiceTraining = () => {
    AppStore.updateVoiceSettings({
      customStylePrompt: customPromptDraft.trim(),
    });
    setTrainModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Clean Modern Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Voice Companion</Text>
          <Text style={styles.headerSubtitle}>
            {activePersona.name.split(' ')[0]} · {voiceSettings.speechSpeed}x ·{' '}
            {voiceSettings.continuousMode ? 'Continuous Loop ON' : 'Single Turn'}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setCustomPromptDraft(voiceSettings.customStylePrompt);
            setTrainModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.trainVoiceBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Train voice and personality"
        >
          <Feather name="sliders" size={14} color={Colors.primary} />
          <Text style={styles.trainVoiceBtnText}>Train Voice</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Continuous Hands-Free Mode Toggle Card */}
        <View style={styles.continuousBar}>
          <View style={styles.continuousLeft}>
            <View style={styles.loopIconBox}>
              <Feather name="repeat" size={15} color={Colors.accent} />
            </View>
            <View style={styles.continuousTextCol}>
              <Text style={styles.continuousTitle}>
                Continuous Voice Conversation
              </Text>
              <Text style={styles.continuousSubtitle}>
                {voiceSettings.continuousMode
                  ? `Auto-sends after ${autoSendSeconds}s & keeps talking back and forth`
                  : 'Tap orb manually to start and finish each turn'}
              </Text>
            </View>
          </View>
          <Switch
            value={voiceSettings.continuousMode}
            onValueChange={(val) =>
              AppStore.updateVoiceSettings({ continuousMode: val })
            }
            trackColor={{ false: Colors.border, true: Colors.accent }}
          />
        </View>

        {/* Live Memory Learned Toast */}
        {lastMemoryNotice ? (
          <View style={styles.memoryLearnedPill}>
            <Feather name="bookmark" size={14} color={Colors.accent} />
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

        {/* State Pills */}
        <View style={styles.stateRow}>
          {STATE_PILLS.map((pill) => {
            const active = interactionState === pill.key;
            return (
              <View
                key={pill.key}
                style={[styles.statePill, active && styles.statePillActive]}
              >
                <Text
                  style={[
                    styles.statePillText,
                    active && styles.statePillTextActive,
                  ]}
                >
                  {pill.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Main Interactive Voice Orb */}
        <VoiceButton
          state={interactionState}
          recordingSeconds={recordingSeconds}
          onPress={handlePrimaryMicPress}
        />

        <Text style={styles.statusMessage}>{statusMessage}</Text>

        {/* Quick Action Buttons when Listening or Speaking */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={cancelRecording}
            disabled={interactionState === 'idle'}
            style={({ pressed }) => [
              styles.controlButton,
              styles.cancelButton,
              interactionState === 'idle' && styles.controlButtonDisabled,
              pressed && interactionState !== 'idle' && styles.pressed,
            ]}
          >
            <Feather
              name="pause-circle"
              size={16}
              color={
                interactionState !== 'idle' ? Colors.error : Colors.textMuted
              }
            />
            <Text
              style={[
                styles.controlButtonText,
                {
                  color:
                    interactionState !== 'idle'
                      ? Colors.error
                      : Colors.textMuted,
                },
              ]}
            >
              Pause Loop
            </Text>
          </Pressable>

          <Pressable
            onPress={stopSpeaking}
            disabled={interactionState !== 'speaking'}
            style={({ pressed }) => [
              styles.controlButton,
              styles.stopButton,
              interactionState !== 'speaking' && styles.controlButtonDisabled,
              pressed && interactionState === 'speaking' && styles.pressed,
            ]}
          >
            <Feather
              name="volume-x"
              size={16}
              color={
                interactionState === 'speaking'
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
            <Text
              style={[
                styles.controlButtonText,
                {
                  color:
                    interactionState === 'speaking'
                      ? Colors.primary
                      : Colors.textMuted,
                },
              ]}
            >
              Stop Speaking
            </Text>
          </Pressable>
        </View>

        {/* Live Transcript & Spoken Response Cards */}
        <View style={styles.conversationCard}>
          <View style={styles.turnBlock}>
            <View style={styles.turnHeader}>
              <Feather name="mic" size={13} color={Colors.accent} />
              <Text style={styles.turnLabel}>You Spoke</Text>
            </View>
            <Text
              style={[
                styles.turnText,
                !recognizedSpeechPreview && styles.turnPlaceholder,
              ]}
            >
              {recognizedSpeechPreview ||
                'Tap the blue orb and speak naturally—your words will appear here.'}
            </Text>
          </View>

          <View style={styles.turnDivider} />

          <View style={styles.turnBlock}>
            <View style={styles.turnHeader}>
              <Feather name="volume-2" size={13} color={Colors.primary} />
              <Text style={styles.turnLabel}>Aura’s Reply</Text>
            </View>
            <Text
              style={[
                styles.turnText,
                !assistantResponsePreview && styles.turnPlaceholder,
              ]}
            >
              {assistantResponsePreview ||
                'Aura will answer you out loud and automatically remember important details.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Train Voice & Personality Modal */}
      <Modal
        visible={trainModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTrainModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Train Voice & Personality</Text>
              <Pressable
                onPress={() => setTrainModalVisible(false)}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>1. Choose Voice Persona</Text>
              <View style={styles.optionsCol}>
                {AppConfig.voicePersonas.map((p) => {
                  const selected = voiceSettings.selectedVoiceId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() =>
                        AppStore.updateVoiceSettings({
                          selectedVoiceId: p.id,
                          voicePitch: p.pitch,
                          speechSpeed: p.defaultRate,
                        })
                      }
                      style={[
                        styles.personaRow,
                        selected && styles.personaRowSelected,
                      ]}
                    >
                      <View>
                        <Text
                          style={[
                            styles.personaName,
                            selected && styles.personaNameSelected,
                          ]}
                        >
                          {p.name}
                        </Text>
                        <Text style={styles.personaDesc}>{p.description}</Text>
                      </View>
                      <Feather
                        name={selected ? 'check-circle' : 'circle'}
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
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
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
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
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
                4. Hands-Free Phrase Window (Continuous Mode)
              </Text>
              <View style={styles.chipsWrap}>
                {[4, 5, 7, 10].map((sec) => {
                  const selected = autoSendSeconds === sec;
                  return (
                    <Pressable
                      key={sec}
                      onPress={() => setAutoSendSeconds(sec)}
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trainVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  trainVoiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  continuousBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    marginBottom: Spacing.md,
  },
  continuousLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  loopIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continuousTextCol: {
    flex: 1,
  },
  continuousTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  continuousSubtitle: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  memoryLearnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: '#B7E4C7',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: Spacing.md,
  },
  memoryLearnedText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.accent,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  statePill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statePillActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statePillTextActive: {
    color: Colors.textInverse,
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceDanger,
    borderColor: '#FEB2B2',
  },
  stopButton: {
    backgroundColor: Colors.primarySoft,
    borderColor: '#90CDF4',
  },
  controlButtonDisabled: {
    backgroundColor: Colors.surfaceSoft,
    borderColor: Colors.border,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  conversationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  turnBlock: {
    gap: 6,
  },
  turnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  turnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  turnText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  turnPlaceholder: {
    color: Colors.textMuted,
    fontSize: 13.5,
  },
  turnDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 29, 32, 0.38)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
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
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
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
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personaRowSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
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
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderRadius: Radius.md,
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
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.84,
  },
});
