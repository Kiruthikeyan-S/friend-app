import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GlassBackground } from '@/components/GlassBackground';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppStore, useAppStore } from '@/services/appStore';
import { MemoryItem } from '@/types/memory';

export default function MemoryAndHistoryScreen() {
  const router = useRouter();
  const { memories, liveSessions } = useAppStore();

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingItem(null);
    setDraftTitle('');
    setDraftContent('');
    setFormError(null);
    setEditorVisible(true);
  };

  const openEditModal = (item: MemoryItem) => {
    setEditingItem(item);
    setDraftTitle(item.title);
    setDraftContent(item.content);
    setFormError(null);
    setEditorVisible(true);
  };

  const handleSaveMemory = () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      setFormError('Enter both a title and detail.');
      return;
    }

    if (editingItem) {
      AppStore.updateMemory(editingItem.id, {
        category: editingItem.category,
        title: draftTitle,
        content: draftContent,
        explicitConsentGranted: true,
      });
    } else {
      AppStore.addApprovedMemory({
        category: 'Profile',
        title: draftTitle,
        content: draftContent,
        explicitConsentGranted: true,
      });
    }
    setEditorVisible(false);
  };

  const historySessions = liveSessions.filter((s) => s.messageCount > 1);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Memory & History</Text>
          <Pressable
            onPress={openAddModal}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Add memory"
          >
            <Feather name="plus" size={16} color={Colors.textInverse} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Saved Memories */}
          <Text style={styles.sectionHeading}>
            Saved Memories ({memories.length})
          </Text>
          {memories.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="bookmark" size={24} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No saved memories yet.</Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {memories.map((item) => (
                <View key={item.id} style={styles.glassCard}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardBody}>{item.content}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => openEditModal(item)}
                        hitSlop={8}
                        style={styles.iconCircle}
                      >
                        <Feather name="edit-2" size={14} color={Colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => AppStore.deleteMemory(item.id)}
                        hitSlop={8}
                        style={styles.iconCircle}
                      >
                        <Feather name="trash-2" size={14} color={Colors.error} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section 2: Chat History */}
          <Text style={[styles.sectionHeading, { marginTop: Spacing.xl }]}>
            Chat History ({historySessions.length})
          </Text>
          {historySessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="clock" size={24} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No past conversations yet.</Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {historySessions.map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() => {
                    AppStore.selectConversation(session.id, false);
                    router.push('/(tabs)/chat');
                  }}
                  style={({ pressed }) => [
                    styles.glassCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.historyIcon}>
                      <Feather name="message-circle" size={15} color={Colors.primary} />
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {session.title}
                      </Text>
                      <Text style={styles.cardBody} numberOfLines={1}>
                        {session.previewText}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={17} color={Colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add / Edit Memory Modal */}
        <Modal
          visible={editorVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setEditorVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Edit Memory' : 'Add Memory'}
                </Text>
                <Pressable onPress={() => setEditorVisible(false)}>
                  <Feather name="x" size={20} color={Colors.textPrimary} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="e.g., Name"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Detail</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 84, textAlignVertical: 'top' }]}
                value={draftContent}
                onChangeText={setDraftContent}
                placeholder="e.g., My name is Alex"
                placeholderTextColor={Colors.textMuted}
                multiline
              />

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Pressable onPress={handleSaveMemory} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  addButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  listGap: {
    gap: 10,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardBody: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: 12.5,
    color: Colors.error,
    marginTop: 8,
  },
  saveBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.84,
  },
});
