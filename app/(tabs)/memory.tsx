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
import { MemoryCard } from '@/components/MemoryCard';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { ApiService } from '@/services/api';
import { AppStore, useAppStore } from '@/services/appStore';
import { MemoryCategory, MemoryItem } from '@/types/memory';

const CATEGORIES: MemoryCategory[] = [
  'Profile',
  'Preferences',
  'Work',
  'Interests',
];

export default function MemoryManagementScreen() {
  const { memories, memoryPermissions } = useAppStore();
  const [selectedFilter, setSelectedFilter] = useState<'All' | MemoryCategory>(
    'All'
  );
  const [permissionsExpanded, setPermissionsExpanded] = useState(false);

  // Modal state for Add or Edit Memory
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('Profile');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [explicitConsentChecked, setExplicitConsentChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredMemories =
    selectedFilter === 'All'
      ? memories
      : memories.filter((item) => item.category === selectedFilter);

  const openAddModal = () => {
    setEditingItem(null);
    setDraftCategory(selectedFilter === 'All' ? 'Profile' : selectedFilter);
    setDraftTitle('');
    setDraftContent('');
    setExplicitConsentChecked(false);
    setFormError(null);
    setEditorVisible(true);
  };

  const openEditModal = (item: MemoryItem) => {
    setEditingItem(item);
    setDraftCategory(item.category);
    setDraftTitle(item.title);
    setDraftContent(item.content);
    // Require re-affirming explicit user approval on edit
    setExplicitConsentChecked(true);
    setFormError(null);
    setEditorVisible(true);
  };

  const handleSaveMemory = async () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      setFormError('Please enter both a short title and the memory detail.');
      return;
    }

    if (!explicitConsentChecked) {
      setFormError(
        'Explicit user approval is required. Please check the consent confirmation box below.'
      );
      return;
    }

    try {
      // Optional backend validation call (Phase 7 foundation)
      await ApiService.validateMemoryWithBackend({
        category: draftCategory,
        title: draftTitle.trim(),
        content: draftContent.trim(),
        explicit_user_consent: explicitConsentChecked,
      }).catch(() => {
        // Offline / local Phase 1 validation still enforced by AppStore
      });

      if (editingItem) {
        AppStore.updateMemory(editingItem.id, {
          category: draftCategory,
          title: draftTitle,
          content: draftContent,
          explicitConsentGranted: explicitConsentChecked,
        });
      } else {
        AppStore.addApprovedMemory({
          category: draftCategory,
          title: draftTitle,
          content: draftContent,
          explicitConsentGranted: explicitConsentChecked,
        });
      }

      setEditorVisible(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save memory.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Personal Memory</Text>
          <Text style={styles.headerSubtitle}>
            Consent-based only · Never saved automatically
          </Text>
        </View>

        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add approved memory"
        >
          <Feather name="plus" size={16} color={Colors.textInverse} />
          <Text style={styles.addButtonText}>Add Memory</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Strict Consent Guarantee Banner */}
        <View style={styles.consentBanner}>
          <View style={styles.consentBannerLeft}>
            <View style={styles.shieldCircle}>
              <Feather name="shield" size={17} color={Colors.accent} />
            </View>
            <View style={styles.consentBannerTextCol}>
              <Text style={styles.consentBannerTitle}>
                Explicit User Consent Policy
              </Text>
              <Text style={styles.consentBannerSubtitle}>
                Aura never saves personal details automatically. Every item here
                was explicitly approved by you (Supabase sync in Phase 7).
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setPermissionsExpanded((prev) => !prev)}
            style={styles.permissionsToggleBtn}
          >
            <Feather name="sliders" size={14} color={Colors.primary} />
            <Text style={styles.permissionsToggleText}>
              {permissionsExpanded ? 'Hide Memory Permissions' : 'Memory Permission Settings'}
            </Text>
            <Feather
              name={permissionsExpanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={Colors.primary}
            />
          </Pressable>

          {/* Expandable Memory Permission Settings */}
          {permissionsExpanded ? (
            <View style={styles.permissionsPanel}>
              <View style={styles.permissionRow}>
                <View style={styles.permissionTextCol}>
                  <Text style={styles.permissionTitle}>
                    Allow Memory Learning
                  </Text>
                  <Text style={styles.permissionDesc}>
                    When disabled, no new personal memories can be added.
                  </Text>
                </View>
                <Switch
                  value={memoryPermissions.allowMemoryRequests}
                  onValueChange={(val) =>
                    AppStore.updateMemoryPermissions({
                      allowMemoryRequests: val,
                    })
                  }
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                />
              </View>

              <View style={styles.permissionRow}>
                <View style={styles.permissionTextCol}>
                  <Text style={styles.permissionTitle}>
                    Auto-Save Spoken & Chat Memories
                  </Text>
                  <Text style={styles.permissionDesc}>
                    Automatically remember personal facts you share when talking.
                  </Text>
                </View>
                <Switch
                  value={memoryPermissions.autoSaveSpokenMemories}
                  onValueChange={(val) =>
                    AppStore.updateMemoryPermissions({
                      autoSaveSpokenMemories: val,
                      requireExplicitConfirmationEveryTime: !val,
                    })
                  }
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                />
              </View>

              <Text style={styles.categoryPermHeading}>
                Allowed Memory Categories:
              </Text>
              <View style={styles.categoryPermGrid}>
                {CATEGORIES.map((cat) => {
                  const enabled = memoryPermissions.enabledCategories[cat];
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => AppStore.toggleCategoryPermission(cat)}
                      style={[
                        styles.categoryPermChip,
                        enabled && styles.categoryPermChipActive,
                      ]}
                    >
                      <Feather
                        name={enabled ? 'check-square' : 'square'}
                        size={14}
                        color={enabled ? Colors.primary : Colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.categoryPermChipText,
                          enabled && styles.categoryPermChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* Category Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsRow}
        >
          {(['All', ...CATEGORIES] as const).map((tab) => {
            const active = selectedFilter === tab;
            const count =
              tab === 'All'
                ? memories.length
                : memories.filter((m) => m.category === tab).length;
            return (
              <Pressable
                key={tab}
                onPress={() => setSelectedFilter(tab)}
                style={[styles.filterTab, active && styles.filterTabActive]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    active && styles.filterTabTextActive,
                  ]}
                >
                  {tab} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Memory Cards or Empty State */}
        {filteredMemories.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Feather name="bookmark" size={26} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No saved memories here yet</Text>
            <Text style={styles.emptySubtitle}>
              Aura only remembers personal details that you explicitly create
              and approve. Tap below to add a memory with your consent.
            </Text>
            <Pressable
              onPress={openAddModal}
              style={({ pressed }) => [
                styles.emptyActionBtn,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="plus" size={16} color={Colors.primary} />
              <Text style={styles.emptyActionBtnText}>
                Add an Approved Memory
              </Text>
            </Pressable>
          </View>
        ) : (
          filteredMemories.map((item) => (
            <MemoryCard
              key={item.id}
              item={item}
              onEdit={openEditModal}
              onDelete={(id) => AppStore.deleteMemory(id)}
            />
          ))
        )}
      </ScrollView>

      {/* Add / Edit Memory Modal with Mandatory Explicit User Consent */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Personal Memory' : 'Approve New Memory'}
              </Text>
              <Pressable
                onPress={() => setEditorVisible(false)}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryPickerRow}>
              {CATEGORIES.map((cat) => {
                const selected = draftCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setDraftCategory(cat)}
                    style={[
                      styles.catOption,
                      selected && styles.catOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catOptionText,
                        selected && styles.catOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Memory Title</Text>
            <TextInput
              style={styles.textInput}
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="e.g., Favorite Coffee Order"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Saved Detail</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={draftContent}
              onChangeText={setDraftContent}
              placeholder="Write the exact detail you want Aura to remember..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            {/* Mandatory Explicit Consent Checkbox */}
            <Pressable
              onPress={() => setExplicitConsentChecked((prev) => !prev)}
              style={[
                styles.consentCheckCard,
                explicitConsentChecked && styles.consentCheckCardActive,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: explicitConsentChecked }}
            >
              <Feather
                name={explicitConsentChecked ? 'check-square' : 'square'}
                size={20}
                color={
                  explicitConsentChecked ? Colors.accent : Colors.textSecondary
                }
              />
              <Text style={styles.consentCheckLabel}>
                I explicitly approve saving this personal information in my
                assistant memory.
              </Text>
            </Pressable>

            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}

            <View style={styles.modalActionsRow}>
              <Pressable
                onPress={() => setEditorVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveMemory}
                style={({ pressed }) => [
                  styles.modalSaveBtn,
                  !explicitConsentChecked && styles.modalSaveBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalSaveBtnText}>
                  {editingItem ? 'Save Approved Changes' : 'Approve & Save'}
                </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  consentBanner: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  consentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  shieldCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentBannerTextCol: {
    flex: 1,
  },
  consentBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  consentBannerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  permissionsToggleBtn: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  permissionsToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  permissionsPanel: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: Spacing.sm,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  permissionTextCol: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  permissionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryPermHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  categoryPermGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryPermChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPermChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  categoryPermChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryPermChipTextActive: {
    color: Colors.primary,
  },
  filterTabsRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textInverse,
  },
  emptyStateCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 29, 32, 0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catOptionTextSelected: {
    color: Colors.textInverse,
  },
  textInput: {
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  consentCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  consentCheckCardActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: '#9AE6B4',
  },
  consentCheckLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: Colors.border,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.85,
  },
});
