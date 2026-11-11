import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GlassBackground, IridescentMiniOrb } from '@/components/GlassBackground';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { AppStore, useAppStore } from '@/services/appStore';

const SMART_HISTORY_SUGGESTIONS = [
  {
    id: 'prompt-1',
    icon: 'edit-3' as const,
    title: 'Plan my day after asking three quick questions',
  },
  {
    id: 'prompt-2',
    icon: 'compass' as const,
    title: 'Start a creative project with a custom step-by-step plan',
  },
  {
    id: 'prompt-3',
    icon: 'file-text' as const,
    title: 'Remember my personal preferences and daily routine',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { userProfile, memories, liveSessions } = useAppStore();

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Glass Avatar + Notification Badge Row (Matching Left Phone Mockup) */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              style={styles.avatarGlassRing}
            >
              <IridescentMiniOrb size={38} />
            </Pressable>

            <View style={styles.topRightGroup}>
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                style={styles.signInGlassPill}
                accessibilityRole="button"
                accessibilityLabel="Sign In"
              >
                <Text style={styles.signInGlassText}>Sign In</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/memory')}
                style={styles.bellGlassCircle}
                accessibilityRole="button"
                accessibilityLabel="Personal Memories and Notifications"
              >
                <Feather name="bell" size={18} color={Colors.textPrimary} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {Math.max(5, memories.length)}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Hero Heading: "Hello, Ask Me Anything You Need" */}
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>
              Hello, <Text style={styles.heroTitleAccent}>Ask Me</Text>
            </Text>
            <Text style={styles.heroTitle}>Anything You Need</Text>
          </View>

          {/* Glass Pill Action Strip: [ Smart Chat ] [ 🎙️ ] [ 🔖 ] [ 📎 ] */}
          <View style={styles.actionPillsRow}>
            <Pressable
              onPress={() => router.push('/(tabs)/chat')}
              style={({ pressed }) => [
                styles.smartChatPill,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.smartChatPillText}>Smart Chat</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/voice')}
              style={({ pressed }) => [
                styles.iconGlassCircle,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Voice Pulse"
            >
              <Feather name="mic" size={17} color={Colors.textPrimary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/memory')}
              style={({ pressed }) => [
                styles.iconGlassCircle,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Personal Memory"
            >
              <Feather name="bookmark" size={17} color={Colors.textPrimary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              style={({ pressed }) => [
                styles.iconGlassCircle,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Voice and App Settings"
            >
              <Feather name="paperclip" size={17} color={Colors.textPrimary} />
            </Pressable>
          </View>

          {/* Horizontal Frosted Glass Square Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featureCardsRow}
          >
            {/* Card 1: Begin Smart Chat */}
            <Pressable
              onPress={() => router.push('/(tabs)/chat')}
              style={({ pressed }) => [
                styles.glassSquareCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTopIcons}>
                <View style={styles.cardCircleIcon}>
                  <Feather name="cpu" size={17} color={Colors.textPrimary} />
                </View>
                <View style={styles.cardCircleIcon}>
                  <Feather
                    name="arrow-up-right"
                    size={16}
                    color={Colors.textPrimary}
                  />
                </View>
              </View>
              <Text style={styles.glassSquareTitle}>Begin Smart{'\n'}Chat</Text>
            </Pressable>

            {/* Card 2: AI Voice Recognition */}
            <Pressable
              onPress={() => router.push('/(tabs)/voice')}
              style={({ pressed }) => [
                styles.glassSquareCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTopIcons}>
                <View style={styles.cardCircleIcon}>
                  <Feather name="mic" size={17} color={Colors.primary} />
                </View>
                <View style={styles.cardCircleIcon}>
                  <Feather
                    name="arrow-up-right"
                    size={16}
                    color={Colors.textPrimary}
                  />
                </View>
              </View>
              <Text style={styles.glassSquareTitle}>
                AI Voice{'\n'}Recognition
              </Text>
            </Pressable>

            {/* Card 3: Consent Memory Vault */}
            <Pressable
              onPress={() => router.push('/(tabs)/memory')}
              style={({ pressed }) => [
                styles.glassSquareCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTopIcons}>
                <View style={styles.cardCircleIcon}>
                  <Feather name="shield" size={17} color={Colors.accent} />
                </View>
                <View style={styles.cardCircleIcon}>
                  <Feather
                    name="arrow-up-right"
                    size={16}
                    color={Colors.textPrimary}
                  />
                </View>
              </View>
              <Text style={styles.glassSquareTitle}>
                Personal{'\n'}Memory ({memories.length})
              </Text>
            </Pressable>
          </ScrollView>

          {/* Chat History Section (Matching Mockup) */}
          <View style={styles.historySectionHeader}>
            <Text style={styles.historyHeading}>Chat History</Text>
            <Pressable onPress={() => router.push('/(tabs)/chat')}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>

          <View style={styles.historyList}>
            {liveSessions.slice(0, 1).map((session) => (
              <Pressable
                key={session.id}
                onPress={() => {
                  AppStore.selectConversation(session.id, false);
                  router.push('/(tabs)/chat');
                }}
                style={({ pressed }) => [
                  styles.historyGlassRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.historyIconCircle}>
                  <Feather
                    name="message-square"
                    size={15}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.historyRowTitle} numberOfLines={2}>
                  {session.previewText}
                </Text>
                <Feather
                  name="arrow-up-right"
                  size={17}
                  color={Colors.textPrimary}
                />
              </Pressable>
            ))}

            {SMART_HISTORY_SUGGESTIONS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push('/(tabs)/chat')}
                style={({ pressed }) => [
                  styles.historyGlassRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.historyIconCircle}>
                  <Feather
                    name={item.icon}
                    size={15}
                    color={Colors.textPrimary}
                  />
                </View>
                <Text style={styles.historyRowTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Feather
                  name="arrow-up-right"
                  size={17}
                  color={Colors.textPrimary}
                />
              </Pressable>
            ))}
          </View>

          {/* Bottom Get Started CTA */}
          <Pressable
            onPress={() => router.push('/(tabs)/chat')}
            style={({ pressed }) => [
              styles.getStartedGlassBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <Text style={styles.getStartedBtnText}>
              Get Started as {userProfile.name}
            </Text>
            <Feather name="arrow-right" size={17} color={Colors.textInverse} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  avatarGlassRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInGlassPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  signInGlassText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bellGlassCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroHeader: {
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 39,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  heroTitleAccent: {
    color: Colors.primary,
  },
  actionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  smartChatPill: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  smartChatPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  iconGlassCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardsRow: {
    gap: 12,
    paddingBottom: Spacing.lg,
  },
  glassSquareCard: {
    width: 154,
    height: 164,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 2,
  },
  cardTopIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCircleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassSquareTitle: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
  },
  historyHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  historyList: {
    gap: 10,
  },
  historyGlassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#9D7BB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 1,
  },
  historyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRowTitle: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  getStartedGlassBtn: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  getStartedBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  pressed: {
    opacity: 0.84,
  },
});
