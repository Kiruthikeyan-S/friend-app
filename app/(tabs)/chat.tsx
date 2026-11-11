import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { GlassBackground } from '@/components/GlassBackground';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { useChat } from '@/hooks/useChat';
import { AppStore } from '@/services/appStore';
import { ChatMessage } from '@/types/chat';

const QUICK_PROMPTS = [
  'Hey, can you recognize my voice?',
  'Plan my day in 3 simple steps',
  'My favorite drink is iced coffee—remember that!',
];

export default function ChatScreen() {
  const router = useRouter();
  const {
    chatMode,
    activeSession,
    messages,
    liveSessions,
    previewSessions,
    pendingMemoryCandidates,
    lastMemoryNotice,
    inputText,
    setInputText,
    isTyping,
    playingMessageId,
    backendOnline,
    sendMessage,
    toggleVoicePlayback,
    startNewConversation,
    switchMode,
    selectConversation,
  } = useChat();

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 20}
        >
          {/* Glassmorphic Header (Matching Right Phone "Smart Chat" Mockup) */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => [
                styles.circleGlassBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Smart Hub Dashboard"
            >
              <Feather
                name="chevron-left"
                size={20}
                color={Colors.textPrimary}
              />
            </Pressable>

            <View style={styles.headerCenter}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Smart Chat</Text>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        backendOnline === false
                          ? Colors.warning
                          : Colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.headerSubtitle}>
                {chatMode === 'preview'
                  ? 'Viewing Example Preview'
                  : 'Aura AI · Instant Voice & Text'}
              </Text>
            </View>

            <Pressable
              onPress={() => setHistoryModalVisible(true)}
              style={({ pressed }) => [
                styles.circleGlassBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open chat history and new chat menu"
            >
              <Feather
                name="more-vertical"
                size={18}
                color={Colors.textPrimary}
              />
            </Pressable>
          </View>

          {/* Memory Learned Glass Toast */}
          {lastMemoryNotice ? (
            <View style={styles.memoryToast}>
              <View style={styles.memoryToastLeft}>
                <Feather name="bookmark" size={14} color={Colors.primary} />
                <Text style={styles.memoryToastText} numberOfLines={2}>
                  {lastMemoryNotice}
                </Text>
              </View>
              <Pressable
                onPress={() => AppStore.clearMemoryNotice()}
                hitSlop={8}
              >
                <Feather name="x" size={15} color={Colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}

          {/* 1-Tap Consent Approval Glass Banner */}
          {pendingMemoryCandidates.length > 0 ? (
            <View style={styles.candidateBanner}>
              <View style={styles.candidateTextCol}>
                <Text style={styles.candidateTitle}>
                  Save to Memory? ({pendingMemoryCandidates[0].category})
                </Text>
                <Text style={styles.candidateContent}>
                  {pendingMemoryCandidates[0].title}:{' '}
                  {pendingMemoryCandidates[0].content}
                </Text>
              </View>
              <View style={styles.candidateActions}>
                <Pressable
                  onPress={() =>
                    AppStore.approvePendingCandidate(
                      pendingMemoryCandidates[0].id
                    )
                  }
                  style={styles.approveChip}
                >
                  <Text style={styles.approveChipText}>Approve</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    AppStore.dismissPendingCandidate(
                      pendingMemoryCandidates[0].id
                    )
                  }
                  style={styles.dismissChip}
                >
                  <Feather name="x" size={14} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Preview Mode Banner */}
          {chatMode === 'preview' ? (
            <View style={styles.previewBanner}>
              <Text style={styles.previewBannerText}>
                Example Preview ({activeSession?.title})
              </Text>
              <Pressable
                onPress={() => switchMode('live')}
                style={styles.returnLiveChip}
              >
                <Text style={styles.returnLiveChipText}>Back to Live Chat</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Chat Message List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListHeaderComponent={
              chatMode === 'live' && messages.length <= 1 ? (
                <View style={styles.starterContainer}>
                  <View style={styles.starterTopRow}>
                    <Text style={styles.starterHeading}>
                      Ask Me Anything You Need:
                    </Text>
                    <Pressable
                      onPress={startNewConversation}
                      style={styles.newMiniPill}
                    >
                      <Feather name="plus" size={12} color={Colors.primary} />
                      <Text style={styles.newMiniPillText}>Fresh Chat</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.starterRow}
                  >
                    {QUICK_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt}
                        onPress={() => sendMessage(prompt)}
                        style={({ pressed }) => [
                          styles.starterChip,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.starterChipText}>{prompt}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : undefined
            }
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isPlaying={playingMessageId === item.id}
                onTogglePlayback={toggleVoicePlayback}
              />
            )}
            ListFooterComponent={isTyping ? <LoadingIndicator /> : undefined}
          />

          {/* Floating Glass Chat Input Bar */}
          <ChatInput
            value={inputText}
            onChangeText={setInputText}
            onSend={() => sendMessage()}
            onPressMicrophone={() => router.push('/(tabs)/voice')}
            disabled={isTyping}
          />

          {/* Conversation History Glass Modal */}
          <Modal
            visible={historyModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setHistoryModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chat History</Text>
                  <Pressable
                    onPress={() => setHistoryModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <Feather name="x" size={20} color={Colors.textPrimary} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionLabel}>
                    Your Live Conversations
                  </Text>
                  {liveSessions.map((session) => {
                    const isCurrent =
                      chatMode === 'live' && session.id === activeSession?.id;
                    return (
                      <Pressable
                        key={session.id}
                        onPress={() => {
                          selectConversation(session.id, false);
                          setHistoryModalVisible(false);
                        }}
                        style={[
                          styles.sessionCard,
                          isCurrent && styles.sessionCardActive,
                        ]}
                      >
                        <View style={styles.sessionTopRow}>
                          <Text style={styles.sessionTitle}>
                            {session.title}
                          </Text>
                          <Text style={styles.sessionMeta}>
                            {session.messageCount} msg
                          </Text>
                        </View>
                        <Text style={styles.sessionPreview} numberOfLines={1}>
                          {session.previewText}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <Text
                    style={[styles.sectionLabel, { marginTop: Spacing.lg }]}
                  >
                    UI Preview Examples (Separated Demo Data)
                  </Text>
                  {previewSessions.map((session) => {
                    const isCurrent =
                      chatMode === 'preview' &&
                      session.id === activeSession?.id;
                    return (
                      <Pressable
                        key={session.id}
                        onPress={() => {
                          selectConversation(session.id, true);
                          setHistoryModalVisible(false);
                        }}
                        style={[
                          styles.sessionCard,
                          isCurrent && styles.sessionCardActive,
                        ]}
                      >
                        <View style={styles.sessionTopRow}>
                          <Text style={styles.sessionTitle}>
                            {session.title}
                          </Text>
                          <Text style={styles.previewBadge}>Preview</Text>
                        </View>
                        <Text style={styles.sessionPreview} numberOfLines={1}>
                          {session.previewText}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Pressable
                  onPress={() => {
                    startNewConversation();
                    setHistoryModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalPrimaryBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Feather name="plus" size={18} color={Colors.textInverse} />
                  <Text style={styles.modalPrimaryBtnText}>
                    New Smart Chat Conversation
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
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
  headerCenter: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  memoryToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    marginHorizontal: Spacing.lg,
    marginTop: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(236, 106, 181, 0.45)',
    gap: 8,
  },
  memoryToastLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memoryToastText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.primary,
  },
  candidateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    marginHorizontal: Spacing.lg,
    marginTop: 6,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  candidateTextCol: {
    flex: 1,
  },
  candidateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  candidateContent: {
    fontSize: 12.5,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  candidateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approveChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  approveChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  dismissChip: {
    padding: 6,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceWarning,
    marginHorizontal: Spacing.lg,
    marginTop: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#F6AD55',
  },
  previewBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  returnLiveChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  returnLiveChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  starterContainer: {
    marginBottom: Spacing.sm,
  },
  starterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starterHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  newMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  newMiniPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  starterRow: {
    gap: 8,
  },
  starterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  starterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.32)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: Radius.md,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sessionMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  previewBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
    backgroundColor: Colors.surfaceWarning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sessionPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalPrimaryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.84,
  },
});
