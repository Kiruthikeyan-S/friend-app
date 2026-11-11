import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppConfig } from '@/constants/config';
import { AppStore, useAppStore } from '@/services/appStore';
import { VoiceService } from '@/services/voice';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    userProfile,
    voiceSettings,
    memoryPermissions,
    privacySettings,
    liveSessions,
  } = useAppStore();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);

  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showFeedback = (text: string) => {
    setStatusFeedback(text);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === text ? null : prev));
    }, 3000);
  };

  const handleSaveProfile = () => {
    const cleanName = editName.trim() || 'Alex Morgan';
    const cleanEmail = editEmail.trim() || 'alex.morgan@example.com';
    const initials = cleanName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    AppStore.updateUserProfile({
      name: cleanName,
      email: cleanEmail,
      avatarInitials: initials || 'AM',
    });
    setProfileModalVisible(false);
    showFeedback('Profile display details updated.');
  };

  const handleConfirmClearHistory = () => {
    AppStore.clearAllLiveConversations();
    setClearConfirmVisible(false);
    showFeedback('Live conversation history cleared.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>
          Voice, language, privacy & memory controls
        </Text>
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
        {/* 1. User Profile Card */}
        <Text style={styles.sectionHeading}>User Profile</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userProfile.avatarInitials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileEmail}>{userProfile.email}</Text>
              <View style={styles.authStatusBadge}>
                <Feather name="clock" size={11} color={Colors.warning} />
                <Text style={styles.authStatusText}>
                  Local Profile · Firebase Auth in Phase 6
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                setEditName(userProfile.name);
                setEditEmail(userProfile.email);
                setProfileModalVisible(true);
              }}
              style={styles.editProfileBtn}
            >
              <Feather name="edit-2" size={15} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* 2. Voice Settings */}
        <Text style={styles.sectionHeading}>
          Agent Voice Settings (5 Voices · Tap to Switch & Hear)
        </Text>
        <View style={styles.card}>
          <Text style={styles.subLabel}>
            Choose from 5 distinct AI Agent Voices (tap any voice to hear a live sample):
          </Text>
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
                    showFeedback(`Switched agent voice to ${persona.name}`);
                  }}
                  style={[
                    styles.personaOption,
                    selected && styles.personaOptionSelected,
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text
                      style={[
                        styles.personaName,
                        selected && styles.personaNameSelected,
                      ]}
                    >
                      {persona.name}
                    </Text>
                    <Text style={styles.personaDesc}>
                      {persona.badge} · {persona.description}
                    </Text>
                  </View>
                  <Feather
                    name={selected ? 'volume-2' : 'play-circle'}
                    size={19}
                    color={selected ? Colors.primary : Colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.settingToggleRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>
                Auto-play Assistant Voice Replies
              </Text>
              <Text style={styles.settingDesc}>
                Automatically speak responses when Phase 4 TTS is connected.
              </Text>
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

        {/* 3. Language Selection */}
        <Text style={styles.sectionHeading}>Language Selection</Text>
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
        </View>

        {/* 4. Speech Speed Preference */}
        <Text style={styles.sectionHeading}>Speech Speed Preference</Text>
        <View style={styles.card}>
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

        {/* 5. Privacy & Memory Permissions */}
        <Text style={styles.sectionHeading}>Privacy & Memory Permissions</Text>
        <View style={styles.card}>
          <View style={styles.settingToggleRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>
                Allow Consent-Based Memory Requests
              </Text>
              <Text style={styles.settingDesc}>
                Never automatic. Every memory still requires your explicit approval.
              </Text>
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
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>
                Delete Temporary Voice Buffers After Processing
              </Text>
              <Text style={styles.settingDesc}>
                Automatically discard raw microphone audio once transcribed.
              </Text>
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
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>
                Share Anonymous Crash Diagnostics
              </Text>
              <Text style={styles.settingDesc}>
                Help improve Android layout and audio stability.
              </Text>
            </View>
            <Switch
              value={privacySettings.shareDiagnostics}
              onValueChange={(val) =>
                AppStore.updatePrivacySettings({ shareDiagnostics: val })
              }
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        </View>

        {/* 6. Data & Account Actions */}
        <Text style={styles.sectionHeading}>Data & Session Management</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => setClearConfirmVisible(true)}
            style={({ pressed }) => [
              styles.actionRowButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation history"
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIconBox, { backgroundColor: Colors.surfaceWarning }]}>
                <Feather name="trash-2" size={16} color={Colors.warning} />
              </View>
              <View>
                <Text style={styles.actionRowTitle}>
                  Clear Conversation History
                </Text>
                <Text style={styles.actionRowSubtitle}>
                  Reset {liveSessions.length} active live session(s)
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.actionRowButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIconBox, { backgroundColor: Colors.surfaceDanger }]}>
                <Feather name="log-out" size={16} color={Colors.error} />
              </View>
              <View>
                <Text style={[styles.actionRowTitle, { color: Colors.error }]}>
                  Logout / Exit Workspace
                </Text>
                <Text style={styles.actionRowSubtitle}>
                  Return to Welcome & Authentication screens
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Profile Display</Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
            />
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setProfileModalVisible(false)}
                style={styles.dialogCancelBtn}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                style={styles.dialogPrimaryBtn}
              >
                <Text style={styles.dialogPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Clear Conversation History Confirmation Modal */}
      <Modal
        visible={clearConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setClearConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Clear Conversation History?</Text>
            <Text style={styles.dialogBody}>
              This will clear all live chat messages and start a fresh
              conversation. Separated UI preview examples will remain untouched.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setClearConfirmVisible(false)}
                style={styles.dialogCancelBtn}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmClearHistory}
                style={[styles.dialogPrimaryBtn, { backgroundColor: Colors.error }]}
              >
                <Text style={styles.dialogPrimaryText}>Clear History</Text>
              </Pressable>
            </View>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentSoft,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#9AE6B4',
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  authStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: Colors.surfaceWarning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  authStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning,
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  voicePersonasCol: {
    gap: Spacing.sm,
  },
  personaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personaOptionSelected: {
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
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  choiceChipText: {
    fontSize: 13,
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
    gap: Spacing.md,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionRowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 29, 32, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  dialogBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dialogPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  dialogPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.84,
  },
});
