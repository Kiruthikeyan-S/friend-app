import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GlassBackground } from '@/components/GlassBackground';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppConfig } from '@/constants/config';
import { AppStore, useAppStore } from '@/services/appStore';
import { AuthService } from '@/services/auth';
import { VoiceService } from '@/services/voice';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    userProfile,
    voiceSettings,
    memoryPermissions,
    privacySettings,
  } = useAppStore();

  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(
    null
  );
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showFeedback = (text: string) => {
    setStatusFeedback(text);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === text ? null : prev));
    }, 2500);
  };

  const renderInfoBtn = (title: string, body: string) => (
    <Pressable
      onPress={() => setInfoModal({ title, body })}
      hitSlop={8}
      style={styles.infoBtn}
      accessibilityRole="button"
      accessibilityLabel={`Info about ${title}`}
    >
      <Feather name="info" size={15} color={Colors.primary} />
    </Pressable>
  );

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {statusFeedback ? (
          <View style={styles.feedbackBanner}>
            <Feather name="check-circle" size={15} color={Colors.success} />
            <Text style={styles.feedbackBannerText}>{statusFeedback}</Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Profile */}
          <Text style={styles.sectionHeading}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userProfile.avatarInitials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileEmail}>{userProfile.email}</Text>
              </View>
              {renderInfoBtn(
                'Account Profile',
                'Signed in with your private account. Your chats and memories are saved separately and never shared with other users.'
              )}
            </View>
          </View>

          {/* 2. Agent Voice */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Agent Voice</Text>
            {renderInfoBtn(
              'Agent Voices',
              'Tap any of the 5 voices to switch and hear a live sample. Switching voices only changes vocal tone and speed.'
            )}
          </View>
          <View style={styles.card}>
            <View style={styles.voicePersonasCol}>
              {AppConfig.voicePersonas.map((persona) => {
                const selected = voiceSettings.selectedVoiceId === persona.id;
                return (
                  <Pressable
                    key={persona.id}
                    onPress={() => {
                      AppStore.updateVoiceSettings({
                        selectedVoiceId: persona.id,
                        voicePitch: persona.pitch,
                        speechSpeed: persona.defaultRate,
                      });
                      VoiceService.speakText(persona.sampleText, {
                        personaId: persona.id,
                        language: persona.voiceLocale,
                        pitch: persona.pitch,
                        rate: persona.defaultRate,
                      });
                      showFeedback(`Voice: ${persona.shortName}`);
                    }}
                    style={[
                      styles.personaOption,
                      selected && styles.personaOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.personaName,
                        selected && styles.personaNameSelected,
                      ]}
                    >
                      {persona.shortName}
                    </Text>
                    <Feather
                      name={selected ? 'volume-2' : 'play-circle'}
                      size={18}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.settingToggleRow}>
              <View style={styles.rowLeftWithInfo}>
                <Text style={styles.settingTitle}>Voice on Text Chat</Text>
                {renderInfoBtn(
                  'Voice on Text Chat',
                  'Keep OFF for silent text-only replies in Smart Chat. The Voice tab always speaks out loud.'
                )}
              </View>
              <Switch
                value={voiceSettings.autoPlayAssistantVoice}
                onValueChange={(val) =>
                  AppStore.updateVoiceSettings({ autoPlayAssistantVoice: val })
                }
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>
          </View>

          {/* 3. Language & Speed */}
          <Text style={styles.sectionHeading}>Language & Speed</Text>
          <View style={styles.card}>
            <View style={styles.chipsWrap}>
              {AppConfig.supportedLanguages.map((lang) => {
                const selected = voiceSettings.languageCode === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() =>
                      AppStore.updateVoiceSettings({ languageCode: lang.code })
                    }
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        selected && styles.choiceChipTextSelected,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.chipsWrap}>
              {AppConfig.speechSpeeds.map((item) => {
                const selected = voiceSettings.speechSpeed === item.value;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() =>
                      AppStore.updateVoiceSettings({ speechSpeed: item.value })
                    }
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        selected && styles.choiceChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Privacy */}
          <Text style={styles.sectionHeading}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.settingToggleRow}>
              <View style={styles.rowLeftWithInfo}>
                <Text style={styles.settingTitle}>Save Memories</Text>
                {renderInfoBtn(
                  'Save Memories',
                  'Allows Aura to save personal details you share into your private Memory list.'
                )}
              </View>
              <Switch
                value={memoryPermissions.allowMemoryRequests}
                onValueChange={(val) =>
                  AppStore.updateMemoryPermissions({ allowMemoryRequests: val })
                }
                trackColor={{ false: Colors.border, true: Colors.accent }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingToggleRow}>
              <View style={styles.rowLeftWithInfo}>
                <Text style={styles.settingTitle}>Auto-Clean Audio</Text>
                {renderInfoBtn(
                  'Auto-Clean Audio',
                  'Automatically deletes temporary voice recording files from your phone cache right after transcription.'
                )}
              </View>
              <Switch
                value={privacySettings.localAudioCleanup}
                onValueChange={(val) =>
                  AppStore.updatePrivacySettings({ localAudioCleanup: val })
                }
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingToggleRow}>
              <View style={styles.rowLeftWithInfo}>
                <Text style={styles.settingTitle}>7-Day Data Retention</Text>
                {renderInfoBtn(
                  '7-Day Data Retention',
                  'Temporary chats, unapproved memory candidates, and audio files are automatically deleted every 7 days. Approved memories stay until you delete them.'
                )}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>
                Active
              </Text>
            </View>
          </View>

          {/* 5. About App & Account */}
          <Text style={styles.sectionHeading}>About & Account</Text>
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                setInfoModal({
                  title: AppConfig.appName,
                  body: `Version ${AppConfig.version}\n\n• 5 smooth country-neutral AI voices\n• Instant Voice-to-Voice & Text Chat\n• Private per-account cloud database\n• Automatic temporary audio cleanup`,
                })
              }
              style={styles.actionRowButton}
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIconBox, { backgroundColor: Colors.primarySoft }]}>
                  <Feather name="info" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.actionRowTitle}>About {AppConfig.appName}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={() => setClearConfirmVisible(true)}
              style={styles.actionRowButton}
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIconBox, { backgroundColor: Colors.surfaceWarning }]}>
                  <Feather name="trash-2" size={16} color={Colors.warning} />
                </View>
                <Text style={styles.actionRowTitle}>Clear Chat History</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={async () => {
                await AuthService.signOut();
                await AppStore.signOutUser();
                router.replace('/(auth)/login');
              }}
              style={styles.actionRowButton}
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIconBox, { backgroundColor: Colors.surfaceDanger }]}>
                  <Feather name="log-out" size={16} color={Colors.error} />
                </View>
                <Text style={[styles.actionRowTitle, { color: Colors.error }]}>
                  Sign Out
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </ScrollView>

        {/* Info "(i)" Modal */}
        <Modal
          visible={Boolean(infoModal)}
          animationType="fade"
          transparent
          onRequestClose={() => setInfoModal(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <View style={styles.infoModalHeader}>
                <Text style={styles.dialogTitle}>{infoModal?.title}</Text>
                <Pressable onPress={() => setInfoModal(null)} hitSlop={8}>
                  <Feather name="x" size={18} color={Colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={styles.dialogBody}>{infoModal?.body}</Text>
              <Pressable
                onPress={() => setInfoModal(null)}
                style={styles.dialogPrimaryBtn}
              >
                <Text style={styles.dialogPrimaryText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Clear History Confirmation Modal */}
        <Modal
          visible={clearConfirmVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setClearConfirmVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Clear Chat History?</Text>
              <Text style={styles.dialogBody}>
                This deletes your saved chat messages from this account.
              </Text>
              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => setClearConfirmVisible(false)}
                  style={styles.dialogCancelBtn}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    AppStore.clearAllLiveConversations();
                    setClearConfirmVisible(false);
                    showFeedback('Chat history cleared.');
                  }}
                  style={[styles.dialogPrimaryBtn, { backgroundColor: Colors.error, flex: 1 }]}
                >
                  <Text style={styles.dialogPrimaryText}>Clear</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    padding: Spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  voicePersonasCol: {
    gap: 8,
  },
  personaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  personaOptionSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  personaName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  personaNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: Spacing.md,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeftWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  choiceChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  choiceChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  choiceChipTextSelected: {
    color: Colors.textInverse,
  },
  actionRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.35)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  dialogCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    padding: Spacing.xl,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dialogBody: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dialogPrimaryBtn: {
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  dialogPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
