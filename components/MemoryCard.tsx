import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { MemoryCategory, MemoryItem } from '@/types/memory';

interface MemoryCardProps {
  item: MemoryItem;
  onEdit: (item: MemoryItem) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_META: Record<
  MemoryCategory,
  { bg: string; text: string; icon: keyof typeof Feather.glyphMap }
> = {
  Profile: { bg: Colors.primarySoft, text: Colors.primary, icon: 'user' },
  Preferences: { bg: Colors.accentSoft, text: Colors.accent, icon: 'sliders' },
  Work: { bg: '#FEF3C7', text: '#B45309', icon: 'briefcase' },
  Interests: { bg: '#F3E8FF', text: '#6B21A8', icon: 'heart' },
};

export function MemoryCard({ item, onEdit, onDelete }: MemoryCardProps) {
  const meta = CATEGORY_META[item.category];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: meta.bg }]}>
          <Feather name={meta.icon} size={12} color={meta.text} />
          <Text style={[styles.categoryText, { color: meta.text }]}>
            {item.category}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => onEdit(item)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Edit memory ${item.title}`}
          >
            <Feather name="edit-2" size={15} color={Colors.textSecondary} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() => onDelete(item.id)}
            style={({ pressed }) => [
              styles.iconBtn,
              styles.deleteBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Delete memory ${item.title}`}
          >
            <Feather name="trash-2" size={15} color={Colors.error} />
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>
              Delete
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content}>{item.content}</Text>

      <View style={styles.consentFooter}>
        <View style={styles.consentPill}>
          <Feather name="check-circle" size={12} color={Colors.success} />
          <Text style={styles.consentText}>
            User Consent Verified · {item.consentedAt}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSoft,
  },
  deleteBtn: {
    backgroundColor: Colors.surfaceDanger,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  consentFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
  },
  consentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  consentText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.78,
  },
});
